'use client'
import EventForm from "app/create/editor"
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from "react"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { CalendarEvent } from "app/types"
import { CircularProgress } from "@heroui/react"
import { db } from "@/lib/firebase/initFirebase"

export default function EditEventPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()

    const [event, setEvent] = useState<CalendarEvent | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!id) return
        async function fetchEvent() {
            setLoading(true)
            const docRef = doc(db, "events", id as string)
            const docSnap = await getDoc(docRef)
            if (docSnap.exists()) {
                setEvent({ id: docSnap.id, ...docSnap.data() } as CalendarEvent)
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

    async function handleUpdate(updatedEvent) {
        await updateDoc(doc(db, "events", id as string), updatedEvent)
        router.push(`/events/${id}`)
    }

    return (
        <div>
            <h1>Edit Event</h1>
            <EventForm event={event} onSubmit={handleUpdate} />
        </div>
    )
}