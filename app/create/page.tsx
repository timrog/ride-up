"use client"
import { useState, ChangeEvent, FormEvent, useEffect } from 'react'
import { collection, addDoc, DocumentReference, DocumentData, getDoc, doc, setDoc, DocumentSnapshot, Timestamp } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { Container, Form, Button, Row } from 'react-bootstrap'
import { onIdTokenChanged } from "@/lib/firebase/auth"
import { EventActivity } from "app/types"
import { db } from "@/lib/firebase/initFirebase"
import { getAuth } from "firebase/auth"

type FormDataType = {
    title: string
    date: string
    startTime: string
    endTime: string
    description: string
    routeLink: string
    location: string
}

export default function CreateEvent() {
    const router = useRouter()
    const [formData, setFormData] = useState<FormDataType>({
        title: '',
        date: '',
        startTime: '',
        endTime: '',
        description: '',
        routeLink: '',
        location: ''
    })

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { name, value } = e.target
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }))
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault()

        try {
            const newDoc = {
                ...formData,
                createdAt: Timestamp.now(),
                createdBy: getAuth().currentUser.uid
            }
            const docRef: DocumentReference<DocumentData> = await addDoc(collection(db, 'events'), newDoc)
            router.push(`/events/${docRef.id}`)
        } catch (error) {
            console.error('Error adding event: ', error)
        }
    }

    const [roles, setRoles] = useState({})
    useEffect(() => {
        return onIdTokenChanged(async (user) => {
            user.getIdTokenResult().then(result => setRoles(result.claims.roles))
        })
    }, [])

    return (
        <Container className="mt-4">
            {JSON.stringify(roles)}

            <h1 className="mb-4">Create New Event</h1>

            <Form onSubmit={handleSubmit}>
                <Form.Group>
                    <Form.Label>Event Title</Form.Label>
                    <Form.Control
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                    />
                </Form.Group>

                <Row xs={1} sm={3}>
                    <Form.Group className="col">
                        <Form.Label>Date</Form.Label>
                        <Form.Control
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="col">
                        <Form.Label>Start Time</Form.Label>
                        <Form.Control
                            type="time"
                            name="startTime"
                            value={formData.startTime}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="col">
                        <Form.Label>End Time</Form.Label>
                        <Form.Control
                            type="time"
                            name="endTime"
                            value={formData.endTime}
                            onChange={handleChange}
                            required
                        />
                    </Form.Group>
                </Row>

                <Form.Group>
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                        as="textarea"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                    />
                </Form.Group>

                <Form.Group>
                    <Form.Label>Route</Form.Label>
                    <Form.Control
                        name="routeLink"
                        pattern="^(https?\:\/\/?(www\.)?strava\.com\/routes\/\d{6,}|https\:\/\/(www\.)?ridewithgps\.com\/routes\/\d{6,})$"
                        value={formData.routeLink}
                        onChange={handleChange}
                    />
                </Form.Group>

                <Button variant="primary" type="submit" className="w-100">
                    Create Event
                </Button>
            </Form>
        </Container >
    )
}
