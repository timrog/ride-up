import React from 'react'
import { getDoc, doc, DocumentSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/initFirebase'
import { CalendarEvent } from 'app/types'
import Activity from './activity'
import RouteEmbed from "./routeEmbed"
import { toFormattedDate, toFormattedTime } from "app/format"
import Link from "next/link"
import { Button, ButtonGroup } from "@heroui/button"
import { MapPinIcon, PencilIcon, UserCircleIcon } from "@heroicons/react/24/outline"
import IconLine from "@/components/IconLine"
import WithAuth from "app/withAuthServer"
import { Alert } from "@heroui/alert"
import CancelButton from "./cancelButton"
import DuplicateEventButton from "./DuplicateEventButton"
import FormatHtml from "app/FormatHtml"

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

    const Details = () => (
        <div>
            {event.isCancelled && (<Alert color="danger">
                This event has been cancelled.
            </Alert>)}

            <h1>{event.title}</h1>
            <h2>
                {toFormattedDate(event.date)} <span
                    className="text-gray-500">{toFormattedTime(event.date)}</span>
            </h2>
            <IconLine icon={MapPinIcon}>{event.location}</IconLine>
            <IconLine icon={UserCircleIcon}>{event.createdByName}</IconLine>
            <ButtonGroup className="mb-4">
                <WithAuth role="leader" resourceOwner={event.createdBy}>
                    <Button href={`/events/${id}/edit`}
                        as={Link}
                        startContent={<PencilIcon height={18} />}>
                        Edit
                    </Button>
                    <DuplicateEventButton eventId={id} />
                    <CancelButton id={id} isCancelled={event.isCancelled} />
                </WithAuth>
            </ButtonGroup>
            <p><FormatHtml content={event.description} /></p>
        </div >
    )

    const Route = () => event.routeLink && <RouteEmbed link={event.routeLink} />

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Details />
                <Activity id={id} />
            </div>
            <div>
                <Route />
            </div>
        </div>
    )
}

export default EventPage
