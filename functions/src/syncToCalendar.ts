import * as logger from "firebase-functions/logger"
import { onDocumentWritten } from "firebase-functions/v2/firestore"
import { google } from 'googleapis'
import { defineSecret } from "firebase-functions/params"
import { CalendarEvent } from "../../app/types"
const calendarId = defineSecret('GOOGLE_CALENDAR_ID')
const region = 'europe-west2'

function toCalendarEventId(firestoreId: string): string {
    // Convert to hex then to base32hex (RFC 4648)
    const hex = Buffer.from(firestoreId, 'utf8').toString('hex')
    return hex.toLowerCase().substring(0, 63)
}

export const syncToCalendar = onDocumentWritten({
    document: "events/{eventId}",
    secrets: [calendarId],
    region
}, async (event) => {
    const firestoreEventId = event.params.eventId
    const calendarEventId = toCalendarEventId(firestoreEventId)
    const beforeData = event.data?.before.data() as CalendarEvent | undefined
    const afterData = event.data?.after.data() as CalendarEvent | undefined

    try {
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/calendar']
        })

        const calendar = google.calendar({ version: 'v3', auth })
        const calId = calendarId.value()

        // Document deleted
        if (!afterData && beforeData) {
            logger.info(`Deleting calendar event ${firestoreEventId}`)
            await calendar.events.delete({
                calendarId: calId,
                eventId: calendarEventId
            })
            return
        }

        // Document created or updated
        if (afterData) {
            const startTime = afterData.date.toDate()
            const endTime = new Date(startTime.getTime() + afterData.duration * 60 * 1000)

            let description = afterData.description
            if (afterData.routeLink) {
                description += `\n\nRoute: ${afterData.routeLink}`
            }

            const eventData = {
                summary: afterData.title,
                location: afterData.location,
                description: description,
                start: {
                    dateTime: startTime.toISOString(),
                    timeZone: 'Europe/London',
                },
                end: {
                    dateTime: endTime.toISOString(),
                    timeZone: 'Europe/London',
                },
                status: afterData.isCancelled ? 'cancelled' : 'confirmed'
            }

            // Try to update first, create if doesn't exist
            try {
                await calendar.events.update({
                    calendarId: calId,
                    eventId: calendarEventId,
                    requestBody: eventData
                })
                logger.info(`Updated calendar event ${firestoreEventId}`)
            } catch (error: any) {
                if (error.code === 404) {
                    await calendar.events.insert({
                        calendarId: calId,
                        requestBody: {
                            ...eventData,
                            id: calendarEventId
                        }
                    })
                    logger.info(`Created calendar event ${firestoreEventId}`)
                } else {
                    throw error
                }
            }
        }
    } catch (error) {
        logger.error(`Error syncing event ${firestoreEventId} to calendar:`, error)
        throw error
    }
})
