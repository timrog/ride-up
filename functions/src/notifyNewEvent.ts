import admin from 'firebase-admin'
import { onDocumentCreated } from 'firebase-functions/firestore'
import { defineSecret } from 'firebase-functions/params'
import webpush from 'web-push'
import { CalendarEvent } from '../../app/types'

const region = 'europe-west2'
const vapidPublicKey = defineSecret('VAPID_PUBLIC_KEY')
const vapidPrivateKey = defineSecret('VAPID_PRIVATE_KEY')

export const notifyNewEvent = onDocumentCreated(
    {
        document: 'events/{eventId}',
        region,
        secrets: [vapidPublicKey, vapidPrivateKey]
    },
    async (event) => {
        // Initialize webpush with VAPID details from secrets
        webpush.setVapidDetails(
            'mailto:dev_admin@vcgh.co.uk',
            vapidPublicKey.value(),
            vapidPrivateKey.value()
        )

        try {
            const eventId = event.params.eventId
            const eventData = event.data?.data() as CalendarEvent

            if (!eventData) {
                console.error('No event data found')
                return
            }

            console.log(`New event created: ${eventData.title} (${eventId})`)

            // Get all users with subscriptions
            const db = admin.firestore()
            const usersSnapshot = await db.collection('users').get()

            let totalNotificationsSent = 0
            let totalErrors = 0

            // For each user, get their subscriptions and send notifications
            for (const userDoc of usersSnapshot.docs) {
                const userId = userDoc.id
                const subscriptionsSnapshot = await db
                    .collection('users')
                    .doc(userId)
                    .collection('subscriptions')
                    .get()

                // Send notification to each subscription
                for (const subDoc of subscriptionsSnapshot.docs) {
                    const subscription = subDoc.data() as webpush.PushSubscription

                    try {
                        await webpush.sendNotification(
                            subscription,
                            JSON.stringify({
                                title: `New Event: ${eventData.title}`,
                                body: `${eventData.createdByName} posted a new event`,
                                icon: '/icon.png',
                                badge: '/badge.png',
                                tag: 'new-event',
                                data: {
                                    eventId,
                                    url: `https://calendar.vcgh.co.uk/events/${eventId}`
                                }
                            })
                        )
                        totalNotificationsSent++
                    } catch (error: any) {
                        // If subscription is invalid, remove it
                        if (error.statusCode === 410) {
                            console.log(`Removing invalid subscription for user ${userId}`)
                            await subDoc.ref.delete()
                        } else {
                            console.error(`Error sending notification to ${userId}:`, error.message)
                            totalErrors++
                        }
                    }
                }
            }

            console.log(
                `Notification job complete. Sent: ${totalNotificationsSent}, Errors: ${totalErrors}`
            )
        } catch (error) {
            console.error('Error in notifyNewEvent function:', error)
            throw error
        }
    }
)
