'use client'
import { collection, query, getDocs, Timestamp, where, orderBy, collectionGroup } from 'firebase/firestore'
import { db } from '@/lib/firebase/initFirebase'
import React, { Suspense, useState, useEffect } from 'react'
import { CalendarEvent } from '../types'
import { Card, CardBody, CardFooter, CardHeader } from "@heroui/card"
import { toFormattedDate, toFormattedTime } from "../format"
import { CalendarIcon, ClockIcon, MapPinIcon } from "@heroicons/react/24/outline"
import { Chip } from "@heroui/chip"
import { IconInline } from "@/components/IconLine"
import TagFilter from "../TagFilter"
import { Button } from "@heroui/button"
import Link from "next/link"
import WithAuth from "../withAuthClient"
import { useSearchParams } from 'next/navigation'
import { useRefresh } from '../providers'
import { Skeleton } from "@heroui/react"
import { useAuth } from '@/lib/hooks/useAuth'

type EventWithId = CalendarEvent & { id: string }

function EventCard({ event, includeDate = false }: { event: EventWithId, includeDate?: boolean }) {
    return (
        <Link href={`/events/${event.id}`} className="no-underline text-inherit">
            <Card isHoverable>
                <CardHeader className="flex flex-row gap-2 flex-wrap nowrap">
                    {includeDate && <IconInline icon={CalendarIcon}>{toFormattedDate(event.date.toDate())}</IconInline>}
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
        </Link>
    )
}

async function fetchSignedUpActivityIds(userId: string): Promise<string[]> {
    const q = query(
        collectionGroup(db, 'activity'),
        where('signupIds', 'array-contains', userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => doc.ref.parent.parent!.id)
}

async function fetchUpcomingEvents(filterTags: string[]): Promise<[string, EventWithId[]][]> {
    const eventsRef = collection(db, 'events')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const q = query(eventsRef,
        where('date', '>', Timestamp.fromDate(today)),
        orderBy('date', 'asc'))

    const querySnapshot = await getDocs(q)
    let events: EventWithId[] = querySnapshot.docs.map((doc) => ({
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
    }, {} as Record<string, EventWithId[]>)

    return Object.entries(groupedEvents)
        .sort(([dateA], [dateB]) => dateA > dateB ? 1 : -1)
}

function MyRidesSection({ events, signedUpEventIds }: { events: EventWithId[], signedUpEventIds: string[] }) {
    const myUpcomingEvents = events.filter(e => signedUpEventIds.includes(e.id))
    if (myUpcomingEvents.length === 0) return null
    return (
        <div className="px-4 py-8 bg-primary-100">
            <div className="container mx-auto">
                <h1 className="m-0 text-left mb-4">My Next Ride</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {myUpcomingEvents.map(event => (
                        <EventCard key={event.id} event={event} includeDate />
                    ))}
                </div>
            </div>
        </div>
    )
}

function EventListContent({ events }: { events: [string, EventWithId[]][] | null }) {
    return (
        <div>
            {events === null ? <>
                <Skeleton className="mt-4 w-40 h-8 rounded-lg" />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-8">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-40 rounded-lg" />
                    ))}
                </div>
            </> : events.length === 0 ? (
                <p className="text-center">No upcoming events found.</p>
            ) : (
                        events.map(([date, evs]) => (
                    <div key={date}>
                                <h2 className="text-xl font-bold">{toFormattedDate(new Date(date))}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {evs.map((event) => (
                                        <EventCard key={event.id} event={event} />
                            ))}
                        </div>
                            </div>
                        ))
            )}
        </div>
    )
}

function EventListInner() {
    const searchParams = useSearchParams()
    const tags = searchParams.get('tags')
    const { refreshKey } = useRefresh()
    const { user, loading: authLoading } = useAuth()
    const [events, setEvents] = useState<[string, EventWithId[]][] | null>(null)
    const [signedUpEventIds, setSignedUpEventIds] = useState<string[]>([])

    useEffect(() => {
        if (authLoading) return
        const filterTags = tags ? tags.split(',').filter(Boolean) : []
        Promise.all([
            fetchUpcomingEvents(filterTags),
            user ? fetchSignedUpActivityIds(user.uid) : Promise.resolve([])
        ]).then(([eventsData, activityIds]) => {
            setEvents(eventsData)
            setSignedUpEventIds(activityIds)
        })
    }, [tags, refreshKey, user, authLoading])

    const allEvents = events?.flatMap(([, evs]) => evs) ?? []

    return (
        <>
            <MyRidesSection events={allEvents} signedUpEventIds={signedUpEventIds} />
            <div className="container mx-auto px-4 py-8">
            <div className="mb-8 flex gap-3 flex-wrap justify-center">
                <h1 className="m-0 flex-grow text-left">Upcoming Rides</h1>
                <WithAuth role="leader">
                    <Button as={Link} href="/create" color="secondary">Post a ride</Button>
                </WithAuth>
                </div>
            <TagFilter />
                <EventListContent events={events} />
            </div>
        </>
    )
}

export default function EventList() {
    return (
            <Suspense>
            <EventListInner />
        </Suspense>
    )
}
