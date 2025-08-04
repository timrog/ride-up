"use client"
import { useState, ChangeEvent, FormEvent, useEffect } from 'react'
import { collection, addDoc, DocumentReference, DocumentData, Timestamp } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { onIdTokenChanged } from "@/lib/firebase/auth"
import { db } from "@/lib/firebase/initFirebase"
import { getAuth } from "firebase/auth"
import { Button, Input, Textarea } from "@heroui/react"
import EventForm from "./editor"
import { CalendarEvent } from "app/types"


export default function CreateEvent() {
    const router = useRouter()
    const handleSubmit = async (e: Partial<CalendarEvent>): Promise<void> => {
        debugger
        try {
            const docRef: DocumentReference<DocumentData> = await addDoc(collection(db, 'events'), e)
            router.push(`/events/${docRef.id}`)
        } catch (error) {
            console.error('Error adding event: ', error)
        }
    }
    return (
        <div className="container mt-16">
            <h1>Create a new event</h1>

            <EventForm onSubmit={handleSubmit} />
        </div>)
}
