'use server'

import webpush from 'web-push'
import { createHash } from 'crypto'
import { doc, collection, setDoc, deleteDoc, getDocs } from 'firebase/firestore'
import { getAuthenticatedAppForUser } from "@/lib/firebase/serverApp"

webpush.setVapidDetails(
    'mailto:dev_admin@vcgh.co.uk',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
)

export async function subscribeUser(sub: PushSubscription) {
    try {
        const { currentUser, db } = await getAuthenticatedAppForUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        // Create a stable hash of the endpoint to use as the document ID
        const subscriptionId = createHash('sha256').update(sub.endpoint).digest('hex')
        const subscriptionRef = doc(db, 'users', currentUser.uid, 'subscriptions', subscriptionId)
        await setDoc(subscriptionRef, sub, { merge: true })

        return { success: true }
    } catch (error) {
        console.error('Error subscribing user:', error)
        return { success: false, error: 'Failed to subscribe' }
    }
}

export async function unsubscribeUser(sub: PushSubscription) {
    try {
        const { currentUser, db } = await getAuthenticatedAppForUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        // Create the same hash to locate the document
        const subscriptionId = createHash('sha256').update(sub.endpoint).digest('hex')

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

        // Send notification to each subscription
        const notificationPromises = subscriptionsSnapshot.docs.map(docSnap => {
            const subscription = docSnap.data() as PushSubscription
            return sendPushNotification(subscription, message).catch(error => {
                console.error(`Error sending notification to subscription ${docSnap.id}:`, error)
            })
        })

        await Promise.all(notificationPromises)
        return { success: true }
    } catch (error) {
        console.error('Error sending notification:', error)
        return { success: false, error: 'Failed to send notification' }
    }
}

async function sendPushNotification(subscription: PushSubscription, message: string) {
    webpush.sendNotification(
        subscription,
        JSON.stringify({
            title: 'Test Notification',
            body: message,
            icon: '/icon.png',
                    })
                )
}