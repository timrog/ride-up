
'use server'
import { collection, query, getDocs, Timestamp, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase/initFirebase'
import React from 'react'
import { CalendarEvent } from './types'
import { } from "./installPrompt"
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/card"
import { toFormattedDate, toFormattedTime } from "./format"
import { ClockIcon, MapPinIcon } from "@heroicons/react/24/outline"
import { Chip } from "@heroui/chip"
import { IconInline } from "@/components/IconLine"
import TagFilter from "./TagFilter"
import { Button } from "@heroui/button"
import Link from "next/link"
import WithAuth from "./withAuthClient"
import CalendarButtons from "./CalendarButtons"

async function getUpcomingEvents(filterTags: string[]) {
    const eventsRef = collection(db, 'events')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const q = query(eventsRef,
        where('date', '>', Timestamp.fromDate(today)),
        orderBy('date', 'asc'))

    const querySnapshot = await getDocs(q)
    let events = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data() as CalendarEvent
    }))

    if (filterTags.length > 0) {
        events = events.filter(event =>
            filterTags.some(tag => event.tags?.includes(tag))
        )
    }

    const groupedEvents = events.reduce((acc, event) => {
        const dateKey = event.date.toDate().toISOString().split('T')[0]
        acc[dateKey] = acc[dateKey] || []
        acc[dateKey].push(event)
        return acc
    }, {} as Record<string, typeof events>)

    const eventsByDay = Object.entries(groupedEvents)
        .sort(([dateA], [dateB]) => dateA > dateB ? 1 : -1)

    return eventsByDay
}

export default async function EventList({
    searchParams
}: {
    searchParams: Promise<{ tags?: string }>
}) {
    const { tags } = await searchParams
    const filterTags = tags ? tags.split(',').filter(Boolean) : []
    const events = await getUpcomingEvents(filterTags)

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex gap-3 flex-wrap justify-center">
                <h1 className="m-0 flex-grow text-left">Upcoming Events</h1>
                <WithAuth role="leader">
                    <Button as={Link} href="/create" color="secondary">Post a ride</Button>
                </WithAuth>
            </div>

            <TagFilter />

            <div>
                {events.map(([date, events]) => (
                    <div key={date}>
                        <h2 className="text-xl font-bold"> {toFormattedDate(new Date(date))} </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {events.map((event) => (
                                <a href={`/events/${event.id}`} key={event.id} className="no-underline text-inherit">
                                    <Card key={event.id} isHoverable>
                                        <CardHeader className="flex flex-row gap-2 flex-wrap nowrap">
                                            <IconInline icon={ClockIcon}>{toFormattedTime(event.date.toDate())}</IconInline>
                                            <IconInline icon={MapPinIcon}>{event.location}</IconInline>
                                            {event.isCancelled && <Chip color="danger">Cancelled</Chip>}

                                        </CardHeader>
                                        <CardBody className="text-lg font-bold">
                                            {event.title}
                                        </CardBody>
                                        <CardFooter className="flex flex-wrap gap-1">
                                            {event.tags?.map((tag, index) => (
                                                <Chip key={index}>{tag}</Chip>
                                            ))}
                                        </CardFooter>
                                    </Card>
                                </a>
                            ))}
                        </div>
                    </div>
                ))}
            </div>            {
                events.length === 0 && (
                    <p className="text-center">No upcoming events found.</p>
                )
            }
        </div >
    )
};
