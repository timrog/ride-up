"use client"
import { useState, ChangeEvent, FormEvent, useEffect } from 'react'
import { collection, addDoc, DocumentReference, DocumentData, getDoc, doc, setDoc, DocumentSnapshot, Timestamp } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
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
        <div className="container mt-16">
            {JSON.stringify(roles)}

            <h1>Create New Event</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Event Title</label>
                    <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Start Time</label>
                        <input
                            type="time"
                            name="startTime"
                            value={formData.startTime}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">End Time</label>
                        <input
                            type="time"
                            name="endTime"
                            value={formData.endTime}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Route</label>
                    <input
                        name="routeLink"
                        pattern="^(https?\:\/\/?(www\.)?strava\.com\/routes\/\d{6,}|https\:\/\/(www\.)?ridewithgps\.com\/routes\/\d{6,})$"
                        value={formData.routeLink}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Create Event
                </button>
            </form>
        </div>)
}
