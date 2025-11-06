'use server'
import { revalidatePath } from 'next/cache'
import { doc, getDoc, addDoc, collection, Timestamp, updateDoc } from 'firebase/firestore'
import { CalendarEvent } from './types'
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

export async function duplicateEvent(params: DuplicateParams) {

    const { db } = await getAuthenticatedAppForUser()

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
        const { currentUser } = await getAuthenticatedAppForUser()

        if (!currentUser) {
            return { success: false, error: 'User not authenticated' }
        }

        // Use Admin SDK to bypass Firestore rules
        const adminDb = getAdminApp().firestore()
        const activityRef = adminDb.collection('events').doc(eventId).collection('activity').doc('private')

        const commentRecord = {
            createdAt: admin.firestore.Timestamp.now(),
            name: currentUser.displayName || "Anonymous",
            avatarUrl: currentUser.photoURL,
            userId: currentUser.uid,
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

export async function addSignup(eventId: string) {
    try {
        const { currentUser } = await getAuthenticatedAppForUser()

        if (!currentUser) {
            return { success: false, error: 'User not authenticated' }
        }

        const adminApp = getAdminApp()
        const adminDb = adminApp.firestore()
        const activityRef = adminDb.collection('events').doc(eventId).collection('activity').doc('private')

        const signupRecord = {
            name: currentUser.displayName || "Anonymous",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }

        try {
            await activityRef.update({
                [`signups.${currentUser.uid}`]: signupRecord
            })
        } catch (error: any) {
            if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
                await activityRef.set({
                    signups: {
                        [currentUser.uid]: signupRecord
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

export async function removeSignup(eventId: string) {
    try {
        const { currentUser } = await getAuthenticatedAppForUser()

        if (!currentUser) {
            return { success: false, error: 'User not authenticated' }
        }

        const adminDb = getAdminApp().firestore()
        const activityRef = adminDb.collection('events').doc(eventId).collection('activity').doc('private')

        await activityRef.update({
            [`signups.${currentUser.uid}`]: admin.firestore.FieldValue.delete()
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

