
import { collection, query, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/initFirebase'
import React from 'react'
import Link from 'next/link'
import { CalendarEvent } from './types'
import { InstallPrompt } from "./installPrompt"
import { PushNotificationManager } from "./pushNotifications"
import { Card, CardBody, CardHeader } from "@heroui/card"

async function getUpcomingEvents(): Promise<CalendarEvent[]> {
    const eventsRef = collection(db, 'events')
    const now = Timestamp.now()

    // Query for events with date greater than current time
    const q = query(eventsRef)

    const querySnapshot = await getDocs(q)
    const events: CalendarEvent[] = []

    querySnapshot.forEach((doc) => {
        events.push({
            id: doc.id,
            ...doc.data()
        } as CalendarEvent)
    })

    return events
}

export default async function EventList() {
    const events = await getUpcomingEvents()

    return (
        <div className="py-4">
            <h1>Upcoming Events</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => (
                    <div key={event.id}>
                        <Card>
                            <CardHeader>
                                <h5 className="text-lg font-medium">
                                    <Link href={`/events/${event.id}`}>{event.title}</Link>
                                </h5>
                                <div className="mb-2 text-gray-600">
                                    <span className="inline-block bg-blue-500 text-white rounded-full px-3 py-1 text-sm mr-2">
                                        {event.date.toString()}
                                    </span>
                                    <span className="inline-block bg-gray-500 text-white rounded-full px-3 py-1 text-sm">
                                        {event.location}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardBody>
                                {event.description}
                            </CardBody>
                        </Card>
                    </div>
                ))}
            </div>            {events.length === 0 && (
                <p className="text-center">No upcoming events found.</p>
            )}

            <InstallPrompt />
            <PushNotificationManager />
        </div>
    )
};
