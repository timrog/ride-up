import React from 'react'
import { getDoc, doc, DocumentSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/initFirebase'
import { CalendarEvent } from 'app/types'
import Activity from './activity'
import RouteEmbed from "./routeEmbed"

async function getEvent(id: string) {
    const eventDoc = await getDoc(doc(db, 'events', id)) as DocumentSnapshot<CalendarEvent>
    return eventDoc.data()
}

const EventPage = async ({
    params
}: {
    params: { id: string }
}) => {
    const id = (await params).id
    const event = await getEvent(id)

    const Details = () => (
        <div>
            <h1>{event.title}</h1>
            <p>{event.location}</p>
            <p>{event.date}</p>
            <p style={{ whiteSpace: 'pre-line' }}>{event.description}</p>
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
