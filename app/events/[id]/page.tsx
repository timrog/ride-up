import React from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import { getDoc, doc, DocumentSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase/initFirebase'
import { CalendarEvent, EventActivity } from 'app/types'
import { getAuthenticatedAppForUser } from '@/lib/firebase/serverApp'
import Activity from './activity'
import RouteEmbed from "./routeEmbed"

async function getEvent(id: string) {
    const eventDoc = await getDoc(doc(db, 'events', id)) as DocumentSnapshot<CalendarEvent>
    return eventDoc.data()
}

async function getActivity(id: string) {
    const activityDoc = await getDoc(doc(db, 'events', id, 'activity', 'private')) as DocumentSnapshot<EventActivity>
    return activityDoc.exists() ?
        activityDoc.data() :
        {
            signups: {}, comments: []
        }
}

const EventPage = async ({
    params
}: {
    params: { id: string }
}) => {
    const id = (await params).id
    const event = await getEvent(id)

    const Details = () => (
        <div className="card p-3 mb-4">
            <h1>{event.title}</h1>
            <p>{event.date.toString()}</p>
            <p>{event.location}</p>
            <p style={{ whiteSpace: 'pre-line' }}>{event.description}</p>
        </div>
    )

    const Route = () => event.routeLink && <RouteEmbed link={event.routeLink} />

    return (
        <div className="container py-4">
            <div className="row g-4">
                <div className="col-md-6">
                    <Details />
                    <Activity id={id} />
                </div>
                <div className="col-md-6">
                    <Route />
                </div>
            </div>
        </div>
    )
}

export default EventPage
