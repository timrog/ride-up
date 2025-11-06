"use client"
import { collection, addDoc, DocumentReference, DocumentData } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { db } from "@/lib/firebase/initFirebase"
import EventForm from "./editor"
import { CalendarEvent } from "app/types"


export default function CreateEvent() {
    const router = useRouter()
    const handleSubmit = async (e: Partial<CalendarEvent>): Promise<void> => {
        try {
            const docRef: DocumentReference<DocumentData> = await addDoc(collection(db, 'events'), e)
            router.push(`/events/${docRef.id}`)
        } catch (error) {
            console.error('Error adding event: ', error)
        }
    }
    return (
        <div className="container px-4 sm:mx-auto my-16">
            <h1>Create a new event</h1>

            <EventForm onSubmit={handleSubmit} />
        </div>)
}
