import React from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import { getDoc, doc, DocumentSnapshot, getDocs, collection } from 'firebase/firestore'
import { getAuth } from "firebase/auth"
import { db } from '@/lib/firebase/initFirebase'
import { CalendarEvent, Signup } from 'app/types'
import SignupButton from './signUpButton'
import { getAuthenticatedAppForUser } from '@/lib/firebase/serverApp'
import Messages from './messages'
import RouteEmbed from "./routeEmbed"

export async function generateStaticParams() {
    return []
}

async function getEventData(id: string) {
    const eventDoc = await getDoc(doc(db, 'events', id)) as DocumentSnapshot<CalendarEvent>
    return eventDoc.data()
}

async function getSignups(id: string) {
    const eventSubCollections = await getDocs(collection(db, 'events', id, 'signups'))
    const results = eventSubCollections.docs.map((subCollection) => subCollection.data() as Signup)
    return results
}

const EventPage = async ({
    params
}: {
    params: { id: string }
}) => {
    const id = (await params).id
    const event = await getEventData(id)
    const signups = await getSignups(id)

    const app = await getAuthenticatedAppForUser()
    const activeSignup = signups.some(s => s.userId === app.currentUser.uid)

    const Details = () => (
        <div className="card p-3 mb-4">
            <h1>{event.title}</h1>
            <p>{event.date.toString()}</p>
            <p>{event.location}</p>
            <p style={{ whiteSpace: 'pre-line' }}>{event.description}</p>
            <SignupButton id={id} active={activeSignup} />
        </div>
    )

    const Route = () => event.routeLink && <RouteEmbed link={event.routeLink} />

    return (
        <div className="container py-4">
            <div className="row g-4">
                <div className="col-md-6">
                    <Details />
                    <Messages id={id} />
                </div>
                <div className="col-md-6">
                    <Route />
                </div>
            </div>
        </div>
    )
}

export default EventPage
