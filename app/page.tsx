
import { collection, query, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/initFirebase'
import React from 'react'
import Link from 'next/link'
import { CalendarEvent } from './types'
import { InstallPrompt } from "./installPrompt"
import { PushNotificationManager } from "./pushNotifications"
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/card"
import { toFormattedDate, toFormattedTime } from "./format"
import { CalendarIcon, MapPinIcon } from "@heroicons/react/24/outline"

async function getUpcomingEvents(): Promise<CalendarEvent[]> {
    const eventsRef = collection(db, 'events')

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
                                <div>
                                    <div>
                                        <CalendarIcon height={18} /> {toFormattedDate(event.date)} {toFormattedTime(event.date)}
                                    </div>
                                    <div>
                                        <Link href={`/events/${event.id}`} className="text-lg font-bold">{event.title}</Link>
                                    </div>
                                    <div>
                                        <MapPinIcon height={18} /> {event.location}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardBody>
                                {event.description}
                            </CardBody>
                            <CardFooter>
                                {event.location}
                            </CardFooter>
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
