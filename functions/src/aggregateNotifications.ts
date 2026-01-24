import admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/firestore'
import { NotificationPreferences, NotificationSubscriber } from "../../app/types"

const region = 'europe-west2'

export type AggregatedNotifications = {
    tagUserIds: { [tagName: string]: string[] } // map of tag names to user ids
    userTokens: { [userId: string]: string[] } // map of userIds to tokens
}

export const aggregateNotifications = onDocumentWritten(
    {
        document: 'notifications/{userId}',
        region
    },
    async (event) => {
        try {
            const userId = event.params.userId
            if(userId === '_aggregated') return;

            const beforeData = event.data?.before.data() as NotificationPreferences | undefined
            const afterData = event.data?.after.data() as NotificationPreferences | undefined

            // If document was deleted, remove user from aggregated tags
            if (!afterData) {
                await removeUserFromAggregatedTags(userId, beforeData?.tags || [], beforeData?.tokens || [])
                return
            }

            console.log("Before and after", beforeData, afterData)

            const newTags = afterData.tags || []
            const oldTags = beforeData?.tags || []
            const tokens = afterData.tokens || []

            // Update aggregated tags document
            await updateAggregatedTags(userId, oldTags, newTags, tokens)

            // Update existing future signups with new notification preferences
            if (afterData.tokens && afterData.tokens.length > 0) {
                await updateFutureSignups(userId, afterData)
                await updateCreatedEvents(userId, afterData)
            } else {
                // If tokens array is empty, remove user from all notificationSubscribers
                await removeUserFromAllNotificationSubscribers(userId)
            }

            console.log(`Successfully aggregated notifications for user ${userId}`)
        } catch (error) {
            console.error('Error in aggregateNotifications:', error)
            throw error
        }
    }
)

async function updateAggregatedTags(userId: string, oldTags: string[], newTags: string[], tokens: string[]) {
    const db = admin.firestore()
    const aggregatedRef = db.doc('notifications/_aggregated')

    await db.runTransaction(async (transaction) => {
        const aggregatedDoc = await transaction.get(aggregatedRef)
        const existingData = aggregatedDoc.exists ? aggregatedDoc.data() : {}
        const aggregatedData: AggregatedNotifications = {
            tagUserIds: existingData?.tagUserIds || {},
            userTokens: existingData?.userTokens || {}
        }

        // Remove userId from old tags
        for (const tag of oldTags) {
            if (!newTags.includes(tag) && aggregatedData.tagUserIds[tag]) {
                const existingUserIds = aggregatedData.tagUserIds[tag]
                aggregatedData.tagUserIds[tag] = existingUserIds.filter(id => id !== userId)
                if (aggregatedData.tagUserIds[tag].length === 0) {
                    delete aggregatedData.tagUserIds[tag]
                }
            }
        }

        // Add userId to new tags
        for (const tag of newTags) {
            if (!aggregatedData.tagUserIds[tag]) {
                aggregatedData.tagUserIds[tag] = []
            }
            aggregatedData.tagUserIds[tag] = aggregatedData.tagUserIds[tag].filter(id => id !== userId)
            aggregatedData.tagUserIds[tag].push(userId)
        }

        // Update user token mapping
        if (tokens.length > 0) {
            aggregatedData.userTokens[userId] = tokens
        } else {
            delete aggregatedData.userTokens[userId]
        }

        transaction.set(aggregatedRef, aggregatedData)
    })
}

async function removeUserFromAggregatedTags(userId: string, tags: string[], tokens: string[]) {
    const db = admin.firestore()
    const aggregatedRef = db.doc('notifications/_aggregated')

    await db.runTransaction(async (transaction) => {
        const aggregatedDoc = await transaction.get(aggregatedRef)
        if (!aggregatedDoc.exists) return

        const existingData = aggregatedDoc.data()
        const aggregatedData: AggregatedNotifications = {
            tagUserIds: existingData?.tagUserIds || {},
            userTokens: existingData?.userTokens || {}
        }

        // Remove userId from all tags
        for (const tag of tags) {
            if (aggregatedData.tagUserIds[tag]) {
                aggregatedData.tagUserIds[tag] = aggregatedData.tagUserIds[tag].filter(id => id !== userId)
                if (aggregatedData.tagUserIds[tag].length === 0) {
                    delete aggregatedData.tagUserIds[tag]
                }
            }
        }

        // Remove user token mapping
        delete aggregatedData.userTokens[userId]

        transaction.set(aggregatedRef, aggregatedData)
    })
}

async function updateFutureSignups(userId: string, preferences: NotificationPreferences) {
    const db = admin.firestore()
    const now = new Date()

    const eventsSnapshot = await db.collectionGroup('activity')
        .where(`signupIds`, 'array-contains', userId)
        .get()

    const updates: Promise<void>[] = []

    for (const privateDoc of eventsSnapshot.docs) {
        const eventId = privateDoc.ref.parent.parent?.id
        if (!eventId) continue

        // Get the event to check if it's in the future
        const eventDoc = await db.doc(`events/${eventId}`).get()
        const eventData = eventDoc.data()
        
        if (!eventData || !eventData.date) continue
        
        const eventDate = eventData.date.toDate()
        if (eventDate < now) continue // Skip past events

        // Update notificationSubscribers
        updates.push(
            db.runTransaction(async (transaction) => {
                const privateDocSnap = await transaction.get(privateDoc.ref)
                const privateData = privateDocSnap.data() || {}
                let notificationSubscribers = privateData.notificationSubscribers || []

                // Remove existing entry for this user
                notificationSubscribers = notificationSubscribers.filter((sub: any) => sub.userId !== userId)

                // Add updated entry
                notificationSubscribers.push({
                    userId,
                    eventUpdates: preferences.eventUpdates ?? true,
                    activity: preferences.activityForSignups ?? true
                })

                transaction.update(privateDoc.ref, { notificationSubscribers })
            })
        )
    }

    await Promise.all(updates)
    console.log(`Updated ${updates.length} future signups for user ${userId}`)
}

async function updateCreatedEvents(userId: string, preferences: NotificationPreferences) {
    const db = admin.firestore()
    const now = new Date()

    // Query events created by this user
    const eventsSnapshot = await db.collection('events')
        .where('createdBy', '==', userId)
        .get()

    const updates: Promise<any>[] = []

    for (const eventDoc of eventsSnapshot.docs) {
        const eventData = eventDoc.data()
        
        if (!eventData.date) continue
        
        const eventDate = eventData.date.toDate()
        if (eventDate < now) continue // Skip past events

        const privateRef = db.doc(`events/${eventDoc.id}/activity/private`)

        updates.push(
            db.runTransaction(async (transaction) => {
                const privateDoc = await transaction.get(privateRef)
                const privateData = privateDoc.data() || {}
                let notificationSubscribers = privateData.notificationSubscribers || []

                // Remove existing entry for this user
                notificationSubscribers = notificationSubscribers.filter((sub: any) => sub.userId !== userId)

                // Add updated entry
                notificationSubscribers.push({
                    userId,
                    eventUpdates: preferences.eventUpdates ?? true,
                    activity: preferences.activityForLeader ?? true
                })

                transaction.set(privateRef, { 
                    ...privateData,
                    notificationSubscribers 
                }, { merge: true })
            })
        )
    }

    await Promise.all(updates)
    console.log(`Updated ${updates.length} created events for user ${userId}`)
}

async function removeUserFromAllNotificationSubscribers(userId: string) {
    const db = admin.firestore()

    const activities = await db.collectionGroup('activity')
        .where(`signupIds`, 'array-contains', userId)
        .get()

    const updates: Promise<any>[] = []

    for (const privateDoc of activities.docs) {
        const data = privateDoc.data()
        const notificationSubscribers = data.notificationSubscribers || []

        if (notificationSubscribers.some((sub: NotificationSubscriber) => sub.userId === userId)) {
            updates.push(
                privateDoc.ref.update({
                    notificationSubscribers: notificationSubscribers.filter((sub: NotificationSubscriber) => sub.userId !== userId)
                })
            )
        }
    }

    await Promise.all(updates)
    console.log(`Removed user ${userId} from ${updates.length} notification subscriber lists`)
}
