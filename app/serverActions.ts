'use server'
import { revalidatePath } from 'next/cache'
import { doc, getDoc, addDoc, collection, Timestamp, updateDoc } from 'firebase/firestore'
import { CalendarEvent, Signup, Comment } from './types'
import { getAdminApp, getAuthenticatedAppForUser } from '@/lib/firebase/serverApp'
import admin from 'firebase-admin'

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
    const { db, currentUser } = await getAuthenticatedAppForUser()

    console.log('Current event in duplicateEvent:', params.eventId)
    const { eventId, mode, date } = params

    console.log('getting doc', eventId)
    const snap = await getDoc(doc(db, 'events', eventId))
    console.log('Event snapshot:', snap.exists(), snap.data())
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

    console.log('Duplicating to dates:', targetDates)
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
        console.log('updating link id')

        await updateDoc(doc(db, 'events', eventId), { linkId: eventId })
    }

    revalidatePath(`/events/${eventId}`)
    return { success: true, created: batchResults }
}

export async function addComment(eventId: string, commentText: string) {
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
            // Try to update the existing document
            await activityRef.update({
                comments: admin.firestore.FieldValue.arrayUnion(commentRecord)
            })
        } catch (error: any) {
            // If document doesn't exist (error code 5 = NOT_FOUND), create it
            if (error.code === 5 || error.message?.includes('NOT_FOUND') || error.message?.includes('No document to update')) {
                await activityRef.set({
                    signups: {},
                    comments: [commentRecord]
                })
            } else {
                // Re-throw other errors
                throw error
            }
        }

        return { success: true }
    } catch (error) {
        console.error('Error adding comment:', error)
        return { success: false, error: 'Failed to add comment' }
    }
}

export async function addSignup(eventId: string, signupKey: string) {
    try {
        const { adminDb, currentUser, auth } = await initAuth()

        const activityRef = adminDb.collection('events').doc(eventId).collection('activity').doc('private')
        const user = await auth.getUser(currentUser.uid)

        // Parse signupKey to determine user data
        let phone = user.customClaims?.phone || null
        let name = user.displayName || "Anonymous"

        const parts = signupKey.split('-')
        if (parts.length > 1) {
            // Extra user: uid-index
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

        try {
            console.info("Adding signup for user", user.uid, "to event", eventId)
            await activityRef.update({
                [`signups.${signupKey}`]: signupRecord
            })
            console.info("Adding signup for user", user.uid, "to event", eventId)
        } catch (error: any) {
            if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
                await activityRef.set({
                    signups: {
                        [signupKey]: signupRecord
                    },
                    comments: []
                })
            } else {
                throw error
            }
        }

        return { success: true }
    } catch (error) {
        console.error('Error adding signup:', error)
        return { success: false, error: error.message }
    }
}

export async function removeSignup(eventId: string, signupKey: string) {
    try {
        const { adminDb } = await initAuth()

        const activityRef = adminDb.collection('events').doc(eventId).collection('activity').doc('private')

        await activityRef.update({
            [`signups.${signupKey}`]: admin.firestore.FieldValue.delete()
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
