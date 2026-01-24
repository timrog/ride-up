'use server'

import { createHash } from 'crypto'
import { doc, collection, setDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { getAuthenticatedAppForUser } from "@/lib/firebase/serverApp"
import admin from 'firebase-admin'

export async function subscribeUser(token: string) {
    try {
        const { currentUser, db } = await getAuthenticatedAppForUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        const subscriptionId = createHash('sha256').update(token).digest('hex')
        const subscriptionRef = doc(db, 'users', currentUser.uid, 'subscriptions', subscriptionId)
        await setDoc(subscriptionRef, { token, createdAt: new Date() }, { merge: true })

        return { success: true }
    } catch (error) {
        console.error('Error subscribing user:', error)
        return { success: false, error: 'Failed to subscribe' }
    }
}

export async function unsubscribeUser(token: string) {
    try {
        const { currentUser, db } = await getAuthenticatedAppForUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        // Create the same hash to locate the document
        const subscriptionId = createHash('sha256').update(token).digest('hex')

        // Delete subscription from Firestore
        const subscriptionRef = doc(db, 'users', currentUser.uid, 'subscriptions', subscriptionId)
        await deleteDoc(subscriptionRef)

        return { success: true }
    } catch (error) {
        console.error('Error unsubscribing user:', error)
        return { success: false, error: 'Failed to unsubscribe' }
    }
}

export async function sendNotification(message: string) {
    try {
        var messaging = admin.messaging()
        const { currentUser, db } = await getAuthenticatedAppForUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        // Get all subscriptions for the current user
        const subscriptionsRef = collection(db, 'users', currentUser.uid, 'subscriptions')
        const subscriptionsSnapshot = await getDocs(subscriptionsRef)

        if (subscriptionsSnapshot.empty) {
            return { success: false, error: 'No subscriptions found' }
        }

        const tokens = subscriptionsSnapshot.docs.map(doc => (doc.data() as.token as string).filter(Boolean)

        const fcmMessage = {
            notification: {
                title: 'Test notification',
                body: message
            },
            data: {
                url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000'}/about`
            },
            tokens
        }

        const response = await messaging.sendEachForMulticast(fcmMessage)
        console.log(`Successfully sent ${response.successCount} messages, ${response.failureCount} failures`)

        return { success: true }
    } catch (error) {
        console.error('Error sending notification:', error)
        return { success: false, error: 'Failed to send notification' }
    }
}