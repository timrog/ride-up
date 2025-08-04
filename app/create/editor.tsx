import { Button, Input, Select, SelectItem, Textarea } from "@heroui/react"
import { CalendarEvent } from "app/types"
import { getAuth } from "firebase/auth"
import { Timestamp } from "firebase/firestore"
import React, { ChangeEvent, useState } from "react"

type FormDataType = {
    date: string
    duration: string
    title: string
    description: string
    routeLink: string
    location: string
}

export default function EventForm({ event, onSubmit }
    : { event?: CalendarEvent, onSubmit: (event: Partial<CalendarEvent>) => void }) {

    const date = event?.date.toDate().toISOString() || ''

    const [formData, setFormData] = useState<FormDataType>({
        title: event?.title || '',
        date,
        duration: event?.duration?.toString() || '180',
        description: event?.description || '',
        routeLink: event?.routeLink || '',
        location: event?.location || ''
    })

    function handleSubmit(e) {
        e.preventDefault()
        const newDoc: Partial<CalendarEvent> = {
            ...formData,
            date: Timestamp.fromDate(new Date(formData.date)),
            duration: parseInt(formData.duration, 10)
        }
        if (!event) {
            newDoc.createdAt = Timestamp.now()
            newDoc.createdBy = getAuth().currentUser?.uid || ''
        }
        onSubmit(newDoc)
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { name, value } = e.target
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }))
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            <Input
                label="Event Title"
                placeholder="e.g. Saturday Mod Ride"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                isRequired
            />

            <Input
                label="Meeting point"
                placeholder="e.g. Regents Park"
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                isRequired
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                    label="Date & start time"
                    type="datetime-local"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    min={new Date().toISOString()}
                    onFocus={(e) => e.target.showPicker()}
                    step="900"
                    isRequired
                />

                <Select
                    name="duration"
                    label="Duration"
                    defaultSelectedKeys={[formData.duration]}
                    onChange={e => setFormData(prevState => ({ ...prevState, duration: e.target.value }))}
                    required
                >
                    {Array.from({ length: 16 }, (_, i) => (i + 1) * 30).map(minutes => (
                        <SelectItem key={minutes}>
                            {`${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`.trim()}
                        </SelectItem>
                    ))}
                </Select>
            </div>

            <Textarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                minRows={3}
                isRequired
            />

            <Input
                label="Link to the route"
                placeholder="Strava or RideWithGPS route link"
                name="routeLink"
                type="url"
                pattern={`https\://(www\.)?(strava\.com/routes/\\d{6,}|ridewithgps.com/routes/\\d{6,})`}
                value={formData.routeLink}
                onChange={handleChange}
                errorMessage="Please enter a valid Strava or RideWithGPS route link"
            />

            <Button
                type="submit" color="primary"
            >
                {event ? 'Save' : 'Create Event'}
            </Button>
        </form >
    )
}