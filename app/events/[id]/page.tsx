import React from 'react'
import { getDoc, doc, DocumentSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/initFirebase'
import { CalendarEvent } from 'app/types'
import { toFormattedDate, toFormattedTime } from "app/format"
import { ChevronLeftIcon, MapPinIcon, UserCircleIcon } from "@heroicons/react/24/outline"
import { IconLine } from "@/components/IconLine"
import WithAuth from "app/withAuthServer"
import { Alert } from "@heroui/alert"
import EditButtons from "./EditButtons"
import FormatHtml from "app/FormatHtml"
import EventTabs from "./eventTabs"
import { Chip } from "@heroui/chip"
import Link from "next/link"

async function getEvent(id: string) {
    const eventDoc = await getDoc(doc(db, 'events', id)) as DocumentSnapshot<CalendarEvent>
    return eventDoc.data()
}

const EventPage = async ({
    params
}: {
    params: Promise<{ id: string }>
}) => {
    const { id } = await params
    const event = await getEvent(id)

    if (!event) {
        return <div className="text-center">Event not found</div>
    }

    const isActive = event.date.toDate().getTime() > Date.now()
        && !event.isCancelled

    const Details = () => (
        <div className="md:grid md:grid-cols-2 md:gap-8"
            style={{ gridTemplateColumns: '1fr 2fr' }}>
            <div>
                <Link href="/"><IconLine icon={ChevronLeftIcon}>All events</IconLine></Link>

                <h1>{event.title}</h1>
                {event.isCancelled && (<Alert color="danger">
                    This event has been cancelled.
                </Alert>)}

                <h2>
                    {toFormattedDate(event.date.toDate())} <span
                        className="text-gray-500">{toFormattedTime(event.date.toDate())}</span>
                </h2>
                <div className="mb-4 flex flex-wrap gap-1">
                    {event.tags?.map((tag, index) => (
                        <Chip key={index}>{tag}</Chip>
                    ))}
                </div>
                <IconLine icon={MapPinIcon}>{event.location}</IconLine>
                <IconLine icon={UserCircleIcon}>{event.createdByName}</IconLine>
                <WithAuth role="leader" resourceOwner={event.createdBy}>
                    <EditButtons eventId={id} isCancelled={event.isCancelled} />
                </WithAuth>
            </div>
            <div><FormatHtml content={event.description} /></div>
        </div >
    )

    return (
        <div>
            <EventTabs id={id}
                details={<Details />}
                routeLink={event.routeLink}
                isActive={isActive} />
        </div>
    )
}

export default EventPage
