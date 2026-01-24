import admin from 'firebase-admin'
import { MulticastMessage, SendResponse } from 'firebase-admin/messaging'
import { onDocumentWritten } from 'firebase-functions/firestore'
import { NotificationSubscriber } from "../../app/types"
import { AggregatedNotifications } from "./aggregateNotifications"

const region = 'europe-west2'

export const sendActivityNotifications = onDocumentWritten(
    {
        document: 'events/{eventId}/activity/private',
        region
    },
    async (event) => {
        try {
            const eventId = event.params.eventId
            const beforeData = event.data?.before.data()
            const afterData = event.data?.after.data()

            if (!afterData) {
                console.log(`Activity doc for event ${eventId} was deleted`)
                return
            }

            // Detect new signups
            const beforeSignups = beforeData?.signups || {}
            const afterSignups = afterData.signups || {}
            const newSignupKeys = Object.keys(afterSignups).filter(key => !beforeSignups[key])

            if (newSignupKeys.length > 0) {
                console.log(`Detected ${newSignupKeys.length} new signup(s) for event ${eventId}`)
                await sendSignupNotifications(eventId, newSignupKeys, afterSignups, afterData.notificationSubscribers || [])
            }

            // Detect new comments
            const beforeComments = beforeData?.comments || []
            const afterComments = afterData.comments || []

            if (afterComments.length > beforeComments.length) {
                const newComments = afterComments.slice(beforeComments.length)
                console.log(`Detected ${newComments.length} new comment(s) for event ${eventId}`)
                await sendCommentNotifications(eventId, newComments, afterData.notificationSubscribers || [])
            }

        } catch (error) {
            console.error('Error in sendActivityNotifications:', error)
            throw error
        }
    }
)

async function sendSignupNotifications(
    eventId: string,
    newSignupKeys: string[],
    allSignups: any,
    notificationSubscribers: NotificationSubscriber[]
) {
    const db = admin.firestore()

    // Get event details
    const eventDoc = await db.doc(`events/${eventId}`).get()
    const eventData = eventDoc.data()

    if (!eventData) {
        console.log(`Event ${eventId} not found`)
        return
    }

    // Filter subscribers who want activity notifications
    const subscribersWantingActivity = notificationSubscribers.filter((sub: any) => sub.activity === true)

    if (subscribersWantingActivity.length === 0) {
        console.log('No subscribers want activity notifications')
        return
    }

    // Load aggregated document once
    const aggregatedDoc = await db.doc('notifications/_aggregated').get()
    if (!aggregatedDoc.exists) {
        console.log('No aggregated notification data found')
        return
    }

    const aggregatedData = aggregatedDoc.data() as AggregatedNotifications

    // Get tokens for subscribers from aggregated data
    const tokens: string[] = []
    const tokenToUserId: { [token: string]: string } = {}

    for (const subscriber of subscribersWantingActivity) {
        const userTokens = aggregatedData.userTokens?.[subscriber.userId] || []
        for (const token of userTokens) {
            tokens.push(token)
            tokenToUserId[token] = subscriber.userId
        }
    }

    if (tokens.length === 0) {
        console.log('No valid tokens for activity notifications')
        return
    }

    // Build notification message
    const newSignupNames = newSignupKeys.map(key => allSignups[key]?.name || 'Someone').join(', ')
    const totalSignups = Object.keys(allSignups).length

    // Filter out the user who just signed up from receiving their own notification
    const newSignupUserIds = newSignupKeys.map(key => allSignups[key]?.userId).filter(Boolean)
    const filteredTokens = tokens.filter(token => {
        const userId = tokenToUserId[token]
        return !newSignupUserIds.includes(userId)
    })

    if (filteredTokens.length === 0) {
        console.log('No tokens to notify (only the signup user would have been notified)')
        return
    }

    const message : MulticastMessage = {
        notification: {
            title: eventData.title,
            body: `${newSignupNames} signed up. ${totalSignups} in total.`
        },
        webpush:{
            fcmOptions: {
                link: `https://localhost:3000/events/${eventId}`,
            }
        },
        data: {
            eventId,
            tag: 'activity-signup'
        },
        tokens: filteredTokens
    }

    const response = await admin.messaging().sendEachForMulticast(message)
    console.log(`Sent ${response.successCount} signup notifications, ${response.failureCount} failures`)

    const responses = response.responses
    if (response.failureCount > 0) {
        await cleanupInvalidTokens(responses, filteredTokens)
    }
}

async function sendCommentNotifications(
    eventId: string,
    newComments: any[],
    notificationSubscribers: any[]
) {
    const db = admin.firestore()

    // Get event details
    const eventDoc = await db.doc(`events/${eventId}`).get()
    const eventData = eventDoc.data()

    if (!eventData) {
        console.log(`Event ${eventId} not found`)
        return
    }

    // Filter subscribers who want activity notifications
    const subscribersWantingActivity = notificationSubscribers.filter((sub: any) => sub.activity === true)

    if (subscribersWantingActivity.length === 0) {
        console.log('No subscribers want activity notifications')
        return
    }

    // Load aggregated document once
    const aggregatedDoc = await db.doc('notifications/_aggregated').get()
    if (!aggregatedDoc.exists) {
        console.log('No aggregated notification data found')
        return
    }

    const aggregatedData = aggregatedDoc.data() as AggregatedNotifications

    // Get tokens for subscribers from aggregated data
    const tokens: string[] = []
    const tokenToUserId: { [token: string]: string } = {}

    for (const subscriber of subscribersWantingActivity) {
        const userTokens = aggregatedData.userTokens?.[subscriber.userId] || []
        for (const token of userTokens) {
            tokens.push(token)
            tokenToUserId[token] = subscriber.userId
        }
    }

    if (tokens.length === 0) {
        console.log('No valid tokens for activity notifications')
        return
    }

    // Get details of the newest comment
    const latestComment = newComments[newComments.length - 1]
    const commenterName = latestComment.name || 'Someone'
    const commentText = latestComment.text || ''
    const excerpt = commentText.length > 200 ? commentText.substring(0, 200) + '...' : commentText

    // Filter out the commenter from receiving their own notification
    const filteredTokens = tokens.filter(token => {
        const userId = tokenToUserId[token]
        return userId !== latestComment.userId
    })

    if (filteredTokens.length === 0) {
        console.log('No tokens to notify (only the commenter would have been notified)')
        return
    }

    const message : MulticastMessage = {
        notification: {
            title: commenterName,
            body: `${eventData.title}: ${excerpt}`
        },
        webpush: { 
            fcmOptions: {  
                link: `/events/${eventId}`
            }
        },
        data: {
            eventId,
            url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://calendar.vcgh.co.uk'}/events/${eventId}`,
            tag: 'activity-comment'
        },
        tokens: filteredTokens
    }

    const response = await admin.messaging().sendEachForMulticast(message)
    console.log(`Sent ${response.successCount} comment notifications, ${response.failureCount} failures`)

    if (response.failureCount > 0) {
        await cleanupInvalidTokens(response.responses, filteredTokens)
    }
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
