'use client'
import EventForm from "app/create/editor"
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from "react"
import { doc, updateDoc, getDoc, query, collection, where, getDocs } from "firebase/firestore"
import { CalendarEvent } from "app/types"
import { Button, CircularProgress, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/react"
import { db } from "@/lib/firebase/initFirebase"

export default function EditEventPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()

    const [event, setEvent] = useState<CalendarEvent | null>(null)
    const [loading, setLoading] = useState(true)
    const [modalResolve, setModalResolve] = useState<((value: boolean) => void) | null>(null)

    useEffect(() => {
        if (!id) return
        async function fetchEvent() {
            setLoading(true)
            const docRef = doc(db, "events", id as string)
            const docSnap = await getDoc(docRef)
            if (docSnap.exists()) {
                setEvent(docSnap.data() as CalendarEvent)
            } else {
                setEvent(null)
            }
            setLoading(false)
        }
        fetchEvent()
    }, [id])

    if (loading) {
        return <div><CircularProgress /></div>
    }
    if (!event) {
        return <div>Event not found</div>
    }

    async function handleUpdate(updatedEvent: Partial<CalendarEvent>) {
        await handleRecurring(updatedEvent, doUpdate)
        router.push(`/events/${id}`)
        router.refresh()
    }

    async function doUpdate(id: string, updatedEvent: Partial<CalendarEvent>) {
        await updateDoc(doc(db, "events", id), updatedEvent)
    }

    function askIfShouldUpdateAll() {
        return new Promise<boolean>(resolve => setModalResolve(() => resolve))
            .then(x => {
                setModalResolve(null)
                return x
            })
    }

    async function handleRecurring(updatedEvent: Partial<CalendarEvent>, next: typeof doUpdate) {

        const shouldUpdateAll = event?.linkId && await askIfShouldUpdateAll()
        if (shouldUpdateAll) {
            const eventsQuery = query(
                collection(db, "events"),
                where("linkId", "==", event.linkId)
            )
            const querySnapshot = await getDocs(eventsQuery)

            const updatePromises = querySnapshot.docs.filter(docSnap =>
                docSnap.data().date.toMillis() >= event.date.toMillis()
            ).map(docSnap =>
                next(docSnap.id, { ...updatedEvent, date: docSnap.data().date })
            )
            await Promise.all(updatePromises)
        } else next(id, updatedEvent)
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1>Edit Event</h1>
            <EventForm event={event} onSubmit={handleUpdate} />

            <Modal isOpen={!!modalResolve} onClose={() => setModalResolve(null)}>
                <ModalContent>
                    <ModalHeader>Update Recurring Event</ModalHeader>
                    <ModalBody>
                        <p>This event is part of a recurring series. What would you like to update?</p>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="primary" onPress={() => modalResolve?.(false)}>
                            Just this event
                        </Button>
                        <Button onPress={() => modalResolve?.(true)}>
                            This and all future events
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </div>
    )
}