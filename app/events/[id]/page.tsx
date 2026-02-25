'use client'
import React, { useCallback, useState, useEffect } from 'react'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase/initFirebase'
import { CalendarEvent } from 'app/types'
import { toFormattedDate, toFormattedTime } from "app/format"
import { MapPinIcon, UserCircleIcon } from "@heroicons/react/24/outline"
import { IconLine } from "@/components/IconLine"
import WithAuth from "app/withAuthClient"
import { Alert } from "@heroui/alert"
import EditButtons from "./EditButtons"
import FormatHtml from "app/FormatHtml"
import EventTabs from "./eventTabs"
import { Chip } from "@heroui/chip"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Skeleton } from "@heroui/react"
import { useRefresh } from "app/providers"

const EventPage = () => {
    const { id } = useParams<{ id: string }>()
    const { refreshKey } = useRefresh()
    const [event, setEvent] = useState<CalendarEvent | null | undefined>(undefined)

    const fetchEvent = useCallback(() => {
        if (!id) return
        getDoc(doc(db, 'events', id)).then(snapshot => {
            setEvent(snapshot.exists() ? snapshot.data() as CalendarEvent : null)
        })
    }, [id, refreshKey])

    useEffect(() => { fetchEvent() }, [fetchEvent])

    if (event === undefined) {
        return <div className="px-8">
            <Skeleton className="my-4 w-full h-12 rounded-lg" />
            <div className="md:grid md:grid-cols-2 md:gap-8"
                style={{ gridTemplateColumns: '1fr 2fr' }}>
                <Skeleton className="h-100 rounded-lg" />
                <Skeleton className="h-100 rounded-lg" />
            </div>
        </div>
    }

    if (!event) {
        return <div className="text-center">Event not found</div>
    }

    const isActive = event.date.toDate().getTime() > Date.now()
        && !event.isCancelled

    const Details = () => <>
        <h1 className="text-left mb-3">{event.title}</h1>

        <div className="md:grid md:grid-cols-2 md:gap-8"
            style={{ gridTemplateColumns: '1fr 2fr' }}>

            <div>
                {event.isCancelled && (<Alert color="danger">
                    This event has been cancelled.
                </Alert>)}

                <h2 className="mt-0 pt-0">
                    {toFormattedDate(event.date.toDate())} <span
                        className="text-gray-500">{toFormattedTime(event.date.toDate())}</span>
                </h2>
                <div className="mb-4 flex flex-wrap gap-1">
                    {event.tags?.map((tag, index) => (
                        <Chip key={index}>{tag}</Chip>
                    ))}
                </div>
                <IconLine icon={MapPinIcon}><Link href={`https://www.google.com/maps/search/${encodeURIComponent(event.location)}`} target="_blank">{event.location}</Link></IconLine>
                <IconLine icon={UserCircleIcon}>{event.createdByName}</IconLine>
                <WithAuth role="leader" resourceOwner={event.createdBy}>
                    <EditButtons eventId={id} isCancelled={event.isCancelled} />
                </WithAuth>
            </div>
            <div><FormatHtml content={event.description} /></div>
        </div>
    </>

    return (
            <EventTabs id={id}
                details={<Details />}
                routeLink={event.routeLink}
            isActive={isActive} />
    )
}

export default EventPage