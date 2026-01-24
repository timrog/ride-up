import admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/firestore'
import { CalendarEvent, EventActivity, NotificationPreferences, NotificationSubscriber } from '../../app/types'
import { AggregatedNotifications } from './aggregateNotifications'
import { MulticastMessage, SendResponse } from "firebase-admin/messaging"

const region = 'europe-west2'

export const sendEventNotifications = onDocumentWritten(
    {
        document: 'events/{eventId}',
        region
    },
    async (event) => {
        try {
            const eventId = event.params.eventId
            const beforeData = event.data?.before.data() as CalendarEvent | undefined
            const afterData = event.data?.after.data() as CalendarEvent | undefined

            // Event was deleted
            if (!afterData) {
                console.log(`Event ${eventId} was deleted, skipping notifications`)
                return
            }

            // Case 1: New event created
            if (!beforeData) {
                console.log(`New event created: ${afterData.title} (${eventId})`)
                
                // Initialize notificationSubscribers for creator
                await initializeNotificationSubscribers(eventId, afterData.createdBy)
                
                // Send notifications to users subscribed to these tags
                await sendNewEventNotifications(eventId, afterData)
                return
            }

            // Case 2: Event creator changed
            if (beforeData.createdBy !== afterData.createdBy) {
                console.log(`Event ${eventId} creator changed from ${beforeData.createdBy} to ${afterData.createdBy}`)
                
                // Notify new leader
                await sendLeaderChangeNotification(eventId, afterData.createdBy, afterData.title)
                
                // Update notificationSubscribers
                await initializeNotificationSubscribers(eventId, afterData.createdBy)
                return
            }

            // Case 3: Event was cancelled
            if (!beforeData.isCancelled && afterData.isCancelled) {
                console.log(`Event ${eventId} was cancelled`)
                await sendCancellationNotifications(eventId, afterData)
                return
            }

            // Case 4: Event was updated
            if (hasSignificantChanges(beforeData, afterData)) {
                console.log(`Event ${eventId} was updated`)
                await sendUpdateNotifications(eventId, afterData)
                return
            }

            console.log(`No notification-worthy changes for event ${eventId}`)
        } catch (error) {
            console.error('Error in sendEventNotifications:', error)
            throw error
        }
    }
)

async function initializeNotificationSubscribers(eventId: string, userId: string) {
    const db = admin.firestore()
    
    // Fetch creator's notification preferences
    const prefsDoc = await db.collection('notifications').doc(userId).get()
    const prefsData = prefsDoc.data() as NotificationPreferences | undefined

    // Only add if notifications are enabled
    if (!prefsData?.tokens || prefsData.tokens.length === 0) {
        console.log(`User ${userId} has no notification tokens, not adding to subscribers`)
        return
    }

    const privateRef = db.doc(`events/${eventId}/activity/private`)

    await db.runTransaction(async (transaction) => {
        const privateDoc = await transaction.get(privateRef)
        const privateData = privateDoc.data() as EventActivity || { signups: {}, comments: [], signupIds: []}
        let notificationSubscribers = privateData.notificationSubscribers || []

        // Remove existing entry for this user (if any)
        notificationSubscribers = notificationSubscribers.filter((sub: NotificationSubscriber) => sub.userId !== userId)

        // Add new entry with user's preferences
        notificationSubscribers.push({
            userId,
            eventUpdates: prefsData.eventUpdates ?? true,
            activity: prefsData.activityForLeader ?? true
        })

        transaction.set(privateRef, {
            ...privateData,
            notificationSubscribers
        } as EventActivity, { merge: true })
    })

    console.log(`Initialized notification subscribers for event ${eventId} with creator ${userId}`)
}

async function sendNewEventNotifications(eventId: string, eventData: CalendarEvent) {
    const db = admin.firestore()

    // Get aggregated tag subscriptions
    const aggregatedDoc = await db.doc('notifications/_aggregated').get()
    if (!aggregatedDoc.exists) {
        console.log('No aggregated notification data found')
        return
    }

    const aggregatedData = aggregatedDoc.data() as AggregatedNotifications

    // Get all tokens for users subscribed to any of the event's tags
    const tokens = new Set<string>()
    const userIds = new Set<string>()
    for (const tag of eventData.tags || []) {
        const tagUserIds = aggregatedData.tagUserIds?.[tag] || []
        tagUserIds.forEach(userId => userIds.add(userId))
    }

    for (const userId of userIds) {
        const userTokens = aggregatedData.userTokens?.[userId] || []
        userTokens.forEach(token => tokens.add(token))
    }

    if (tokens.size === 0) {
        console.log('No tokens found for event tags')
        return
    }

    console.log(`Found ${tokens.size} tokens for users subscribed to event tags`)

    const tokenArray = Array.from(tokens)

    // Send FCM notifications
    const message = {
        notification: {
            title: 'New ride posted',
            body: `${eventData.createdByName} posted ${eventData.title}. Sign up now!`
        },
        webpush: { 
            fcmOptions: {  
                link: `/events/${eventId}`
            }
        },
        data: {
            eventId,
            url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://calendar.vcgh.co.uk'}/events/${eventId}`,
            tag: 'new-event'
        },
        tokens: tokenArray
    }

    const response = await admin.messaging().sendEachForMulticast(message)
    console.log(`Sent ${response.successCount} new event notifications, ${response.failureCount} failures`)

    // Clean up invalid tokens
    if (response.failureCount > 0) {
        await cleanupInvalidTokens(response.responses, tokenArray)
    }
}

async function sendLeaderChangeNotification(eventId: string, newLeaderId: string, eventTitle: string) {
    const db = admin.firestore()

    // Get new leader's tokens
    const prefsDoc = await db.collection('notifications').doc(newLeaderId).get()
    const tokens = prefsDoc.data()?.tokens || []

    if (tokens.length === 0) {
        console.log(`New leader ${newLeaderId} has no notification tokens`)
        return
    }

    const message = {
        notification: {
            title: 'You\'re the leader',
            body: `You have been made the leader of ${eventTitle}`
        },
        webpush: { 
            fcmOptions: {  
                link: `/events/${eventId}`
            }
        },
        data: {
            eventId,
            url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://calendar.vcgh.co.uk'}/events/${eventId}`,
            tag: 'leader-change'
        },
        tokens
    }

    try {
        const response = await admin.messaging().sendEachForMulticast(message)
        console.log(`Sent leader change notification to ${newLeaderId}: ${response.successCount} success, ${response.failureCount} failures`)
        
        if (response.failureCount > 0) {
            await cleanupInvalidTokens(response.responses, tokens)
        }
    } catch (error) {
        console.error(`Error sending leader change notification:`, error)
    }
}

async function sendCancellationNotifications(eventId: string, eventData: CalendarEvent) {
    const db = admin.firestore()
    
    const privateDoc = await db.doc(`events/${eventId}/activity/private`).get()
    const privateData = privateDoc.data()
    const notificationSubscribers = privateData?.notificationSubscribers || []

    if (notificationSubscribers.length === 0) {
        console.log('No notification subscribers for cancelled event')
        return
    }

    // Fetch tokens for all subscribers
    const tokens = await fetchTokensForSubscribers(notificationSubscribers)

    if (tokens.length === 0) {
        console.log('No valid tokens for cancellation notifications')
        return
    }

    const message : MulticastMessage = {
        notification: {
            title: 'Event cancelled',
            body: `"${eventData.title}" has been cancelled`
        },
        webpush: { 
            fcmOptions: {  
                link: `/events/${eventId}`
            }
        },
        data: {
            eventId,
            url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://calendar.vcgh.co.uk'}/events/${eventId}`,
            tag: 'event-cancelled'
        },
        tokens
    }

    const response = await admin.messaging().sendEachForMulticast(message)
    console.log(`Sent ${response.successCount} cancellation notifications, ${response.failureCount} failures`)

    if (response.failureCount > 0) {
        await cleanupInvalidTokens(response.responses, tokens)
    }
}

async function sendUpdateNotifications(eventId: string, eventData: CalendarEvent) {
    const db = admin.firestore()
    
    const privateDoc = await db.doc(`events/${eventId}/activity/private`).get()
    const privateData = privateDoc.data()
    const notificationSubscribers = privateData?.notificationSubscribers || []

    if (notificationSubscribers.length === 0) {
        console.log('No notification subscribers for updated event')
        return
    }

    // Fetch tokens for all subscribers
    const tokens = await fetchTokensForSubscribers(notificationSubscribers)

    if (tokens.length === 0) {
        console.log('No valid tokens for update notifications')
        return
    }

    const message : MulticastMessage= {
        notification: {
            title: 'Event updated',
            body: `"${eventData.title}" has been updated`
        },
        webpush: { 
            fcmOptions: {  
                link: `/events/${eventId}`
            }
        },
        data: {
            eventId,
            url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://calendar.vcgh.co.uk'}/events/${eventId}`,
            tag: 'event-updated'
        },
        tokens
    }

    const response = await admin.messaging().sendEachForMulticast(message)
    console.log(`Sent ${response.successCount} update notifications, ${response.failureCount} failures`)

    if (response.failureCount > 0) {
        await cleanupInvalidTokens(response.responses, tokens)
    }
}

async function fetchTokensForSubscribers(subscribers: NotificationSubscriber[]): Promise<string[]> {
    const db = admin.firestore()
    const tokens: string[] = []

    for (const subscriber of subscribers) {
        const prefsDoc = await db.collection('notifications').doc(subscriber.userId).get()
        const userTokens = prefsDoc.data()?.tokens || []
        tokens.push(...userTokens)
    }

    return tokens
}

async function cleanupInvalidTokens(responses: SendResponse[], tokens: string[]) {
    const db = admin.firestore()
    const invalidTokens: string[] = []

    responses.forEach((resp, idx) => {
        if (!resp.success && 
            (resp.error?.code === 'messaging/registration-token-not-registered' ||
             resp.error?.code === 'messaging/invalid-registration-token')) {
            invalidTokens.push(tokens[idx])
        }
    })

    if (invalidTokens.length === 0) return

    // Find and remove invalid tokens from notifications collection
    const notificationsSnapshot = await db.collection('notifications').get()

    const updatePromises = notificationsSnapshot.docs.map(async (doc) => {
        const data = doc.data()
        const userTokens = data.tokens || []
        const filteredTokens = userTokens.filter((token: string) => !invalidTokens.includes(token))
        
        if (filteredTokens.length !== userTokens.length) {
            return doc.ref.update({ tokens: filteredTokens })
        }
        return null
    }).filter(Boolean)

    await Promise.all(updatePromises)
    console.log(`Cleaned up ${updatePromises.length} documents with invalid tokens`)
}

function hasSignificantChanges(before: CalendarEvent, after: CalendarEvent): boolean {
    return before.title !== after.title ||
           before.date?.toMillis() !== after.date?.toMillis() ||
           before.location !== after.location ||
           before.description !== after.description ||
           JSON.stringify(before.tags) !== JSON.stringify(after.tags)
}
