
import { collection, query, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/initFirebase'
import React from 'react'
import { Card, Container, Row, Col, Badge, CardBody, CardTitle, CardText, CardSubtitle } from 'react-bootstrap'
import Link from 'next/link'
import { CalendarEvent } from './types'
import { InstallPrompt } from "./installPrompt"
import { PushNotificationManager } from "./pushNotifications"

async function getUpcomingEvents(): Promise<CalendarEvent[]> {
    const eventsRef = collection(db, 'events')
    const now = Timestamp.now()

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
        <Container className="py-4">
            <h2 className="mb-4">Upcoming Events</h2>
            <Row xs={1} md={2} lg={3} className="g-4">
                {events.map((event) => (
                    <Col key={event.id}>
                        <Card className="h-100">
                            <CardBody>
                                <CardTitle>
                                    <Link href={`/events/${event.id}`}>{event.title}</Link>
                                </CardTitle>
                                <CardSubtitle className="mb-2 text-muted">
                                    <Badge bg="primary" className="me-2">
                                        {event.date.toString()}
                                    </Badge>
                                    <Badge bg="secondary">
                                        {event.location}
                                    </Badge>
                                </CardSubtitle>
                                <CardText>
                                    {event.description}
                                </CardText>
                            </CardBody>
                        </Card>
                    </Col>
                ))}
            </Row>
            {events.length === 0 && (
                <p className="text-center">No upcoming events found.</p>
            )}

            <InstallPrompt />
            <PushNotificationManager />
        </Container>
    )
};
