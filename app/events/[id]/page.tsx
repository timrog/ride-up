import React from 'react'
import { getDoc, doc, DocumentSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/initFirebase'
import { CalendarEvent } from 'app/types'
import Activity from './activity'
import RouteEmbed from "./routeEmbed"
import { toFormattedDate } from "app/format"
import Link from "next/link"
import { Button, ButtonGroup } from "@heroui/button"
import { PencilIcon } from "@heroicons/react/24/outline"

async function getEvent(id: string) {
    const eventDoc = await getDoc(doc(db, 'events', id)) as DocumentSnapshot<CalendarEvent>
    return eventDoc.data()
}

const EventPage = async ({
    params: { id }
}: {
    params: { id: string }
}) => {
    const event = await getEvent(id)

    const Details = () => (
        <div>
            <h1>{event.title}</h1>
            <h2>{toFormattedDate(event.date)}</h2>
            <p>{event.location}</p>
            <ButtonGroup className="mb-4">
                <Button href={`/events/${id}/edit`} as={Link}
                    startContent={<PencilIcon />}> Edit</Button>
            </ButtonGroup>
            <p className="whitespace-pre-line">{event.description}</p>
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
