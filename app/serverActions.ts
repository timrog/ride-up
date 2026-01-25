'use server'
import { revalidatePath } from 'next/cache'
import { doc, getDoc, addDoc, collection, Timestamp, updateDoc } from 'firebase/firestore'
import { CalendarEvent, Signup, Comment, NotificationPreferences, EventActivity } from './types'
import { getAdminApp, getAuthenticatedAppForUser } from '@/lib/firebase/serverApp'
import admin from 'firebase-admin'
import { withSpan } from '@/lib/tracing'

type DuplicateMode = 'single' | 'weekly'

interface DuplicateParams {
    eventId: string
    mode: DuplicateMode
    date: string
}

function addDays(base: Date, days: number) {
    const d = new Date(base.getTime())
    d.setDate(d.getDate() + days)
    return d
}

async function initAuth() {
    const adminDb = getAdminApp().firestore()
    const auth = getAdminApp().auth()
    const { currentUser } = await getAuthenticatedAppForUser()

    if (!currentUser) {
        throw new Error('User not authenticated')
    }

    return { auth, adminDb, currentUser }
}

export async function duplicateEvent(params: DuplicateParams) {
    const { eventId, mode, date } = params

    return withSpan('serverAction.duplicateEvent', { eventId, mode }, async (span) => {
        const { db, currentUser } = await getAuthenticatedAppForUser()

        const snap = await getDoc(doc(db, 'events', eventId))
        if (!snap.exists()) {
            return { success: false, error: 'Source event not found' }
        }
        const source = snap.data() as CalendarEvent
        const sourceDate = source.date.toDate()
        const targetDate = new Date(date)
        targetDate.setHours(sourceDate.getHours(), sourceDate.getMinutes(), 0, 0)

        let targetDates: Date[] = []
        if (mode === 'single') {
            targetDates = [targetDate]
        } else {
            let current = sourceDate
            let count = 0
            const limit = 52
            while (current.getTime() <= targetDate.getTime() && count++ < limit) {
                targetDates.push(current)
                current = addDays(current, 7)
            }
        }

        span.setAttribute('events.created_count', targetDates.length)

        const batchResults: string[] = []
        await Promise.all(targetDates.map(d => {
            const newDoc: Omit<CalendarEvent, 'id'> = {
                ...source,
                isCancelled: false,
                date: Timestamp.fromDate(d),
                createdAt: Timestamp.now(),
                createdBy: currentUser?.uid!,
                createdByName: currentUser?.displayName || 'Unknown',
                linkId: source.linkId || eventId,
            }

            return addDoc(collection(db, 'events'), newDoc)
        }))

        if (source.linkId !== eventId) {
            await updateDoc(doc(db, 'events', eventId), { linkId: eventId })
        }

        revalidatePath(`/events/${eventId}`)
        return { success: true, created: batchResults }
    })
}

export async function addComment(eventId: string, commentText: string) {
    return withSpan('serverAction.addComment', { eventId, 'comment.length': commentText.length }, async () => {
        try {
            const { adminDb, currentUser, auth } = await initAuth()

            const activityRef = adminDb.collection('events').doc(eventId).collection('activity').doc('private')

            const user = await auth.getUser(currentUser.uid)
            const commentRecord: Comment = {
                createdAt: admin.firestore.Timestamp.now() as Timestamp,
                name: user.displayName || "Anonymous",
                avatarUrl: user.photoURL || null,
                userId: user.uid,
                text: commentText
            }

            try {
                await activityRef.update({
                    comments: admin.firestore.FieldValue.arrayUnion(commentRecord)
                })
            } catch (error: unknown) {
                const err = error as { code?: number; message?: string }
                if (err.code === 5 || err.message?.includes('NOT_FOUND') || err.message?.includes('No document to update')) {
                    await activityRef.set({
                        signups: {},
                        comments: [commentRecord]
                    })
                } else {
                    throw error
                }
            }

            return { success: true }
        } catch (error) {
            console.error('Error adding comment:', error)
            return { success: false, error: 'Failed to add comment' }
        }
    })
}

export async function addSignup(eventId: string, signupKey: string) {
    return withSpan('serverAction.addSignup', { eventId, signupKey }, async (span) => {
        try {
            const { adminDb, currentUser, auth } = await initAuth()

            span.setAttribute('user.id', currentUser.uid)

            const activityRef = adminDb.collection('events').doc(eventId).collection('activity').doc('private')
            const user = await auth.getUser(currentUser.uid)

            let phone = user.customClaims?.phone || null
            let name = user.displayName || "Anonymous"

            const parts = signupKey.split('-')
            if (parts.length > 1) {
                const extraUserIndex = parseInt(parts[parts.length - 1])
                if (!isNaN(extraUserIndex) && user.customClaims?.extraUsers && extraUserIndex >= 0 && extraUserIndex < user.customClaims.extraUsers.length) {
                    const extraUser = user.customClaims.extraUsers[extraUserIndex]
                    name = extraUser.displayName
                    phone = extraUser.phone || null
                }
            }

            const signupRecord: Signup = {
                name,
                createdAt: admin.firestore.Timestamp.now() as Timestamp,
                phone,
                avatarUrl: user.photoURL || null,
                userId: user.uid,
                membership: user.customClaims?.membership || null
            }

            const notificationPrefs = await adminDb.collection('notifications').doc(user.uid).get()
            const prefsData = notificationPrefs.data() as NotificationPreferences | undefined

            try {
                const updateData: Record<string, unknown> = {
                    [`signups.${signupKey}`]: signupRecord,
                    signupIds: admin.firestore.FieldValue.arrayUnion(signupKey)
                }

                if (prefsData?.tokens && prefsData.tokens.length > 0) {
                    const activityDoc = await activityRef.get()
                    const activityData = activityDoc.data() || {}
                    let notificationSubscribers = activityData.notificationSubscribers || []

                    notificationSubscribers = notificationSubscribers.filter((sub: { userId: string }) => sub.userId !== user.uid)

                    notificationSubscribers.push({
                        userId: user.uid,
                        eventUpdates: prefsData.eventUpdates ?? true,
                        activity: prefsData.activityForSignups ?? true
                    })

                    updateData.notificationSubscribers = notificationSubscribers
                }

                await activityRef.update(updateData)
            } catch (error: unknown) {
                const err = error as { code?: number; message?: string }
                if (err.code === 5 || err.message?.includes('NOT_FOUND')) {
                    const newData: EventActivity = {
                        signupIds: [signupKey],
                        signups: {
                            [signupKey]: signupRecord,
                        },
                        comments: [],
                        notificationSubscribers: []
                    }

                    if (prefsData?.tokens && prefsData.tokens.length > 0) {
                        newData.notificationSubscribers = [{
                            userId: user.uid,
                            eventUpdates: prefsData.eventUpdates ?? true,
                            activity: prefsData.activityForSignups ?? true
                        }]
                    }

                    await activityRef.set(newData)
                } else {
                    throw error
                }
            }

            return { success: true }
        } catch (error) {
            console.error('Error adding signup:', error)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            return { success: false, error: errorMessage }
        }
    })
}

export async function removeSignup(eventId: string, signupKey: string) {
    try {
        const { adminDb } = await initAuth()

        const activityRef = adminDb.collection('events').doc(eventId).collection('activity').doc('private')

        await activityRef.update({
            [`signups.${signupKey}`]: admin.firestore.FieldValue.delete(),
            signupIds: admin.firestore.FieldValue.arrayRemove(signupKey)
        })

        return { success: true }
    } catch (error) {
        console.error('Error removing signup:', error)
        return { success: false, error: error.message }
    }
}

export async function getLeaders() {
    try {
        const listUsersResult = await getAdminApp().auth().listUsers()

        const leaders = listUsersResult.users
            .filter(user => {
                return user.customClaims?.roles?.includes('leader')
            })
            .map(user => ({
                uid: user.uid,
                displayName: user.displayName || user.email || 'Unknown User'
            }))

        leaders.push({
            uid: 'test-leader-uid',
            displayName: 'Test Leader'
        })
        return { success: true, leaders }
    } catch (error) {
        console.error('Error getting leaders:', error)
        return { success: false, error: 'Failed to get leaders' }
    }
}

export async function transferEventOwnership(eventId: string, newOwnerId: string, newOwnerName: string) {
    try {
        const { db } = await getAuthenticatedAppForUser()

        await updateDoc(doc(db, 'events', eventId), {
            createdBy: newOwnerId,
            createdByName: newOwnerName
        })

        revalidatePath(`/events/${eventId}`)
        return { success: true }
    } catch (error) {
        console.error('Error transferring event ownership:', error)
        return { success: false, error: 'Failed to transfer ownership' }
    }
}
