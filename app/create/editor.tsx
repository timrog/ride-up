import { Autocomplete, AutocompleteItem, Button, DatePicker, Input, Select, SelectItem, Textarea, TimeInput } from "@heroui/react"
import { CalendarEvent } from "app/types"
import { getAuth } from "firebase/auth"
import { Timestamp } from "firebase/firestore"
import React, { ChangeEvent, useState } from "react"
import SelectableTags from "@/components/SelectableTags"

import { CalendarDate, DateValue, fromDate, getLocalTimeZone, Time, toCalendarDate, toCalendarDateTime, today, toTime } from "@internationalized/date"
import { defaultLocations } from "app/tags"

type FormDataType = {
    date: DateValue | undefined
    time: Time | undefined
    duration: string
    title: string
    description: string
    routeLink: string
    location: string
    tags: string[]
}

export default function EventForm({ event, onSubmit }
    : { event?: CalendarEvent, onSubmit: (event: Partial<CalendarEvent>) => void }) {

    const [formData, setFormData] = useState<FormDataType>({
        title: event?.title || '',
        date: event ? toCalendarDate(fromDate(event.date.toDate(), getLocalTimeZone())) : undefined,
        time: event ? toTime(fromDate(event?.date.toDate(), getLocalTimeZone())) : undefined,
        duration: event?.duration?.toString() || '180',
        description: event?.description || '',
        routeLink: event?.routeLink || '',
        location: event?.location || '',
        tags: event?.tags || []
    })

    function handleSubmit(e) {
        e.preventDefault()

        const { date, time, duration, ...rest } = formData

        const newDoc: Partial<CalendarEvent> = {
            ...rest,
            date: Timestamp.fromDate(toCalendarDateTime(date!, time).toDate(getLocalTimeZone())),
            duration: parseInt(duration, 10)
        }
        if (!event) {
            newDoc.createdAt = Timestamp.now()
            newDoc.createdBy = getAuth().currentUser?.uid || ''
            newDoc.createdByName = getAuth().currentUser?.displayName || 'Anonymous'
        }
        onSubmit(newDoc)
    }

    const handleValueChange = (name: keyof FormDataType) => (value: string | string[]) =>
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }))

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { name, value } = e.target
        handleValueChange(name as keyof FormDataType)(value)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 mx-auto max-w-2xl">

            <Input
                autoFocus
                label="Event Title"
                size="lg"
                placeholder="e.g. Saturday Mod Ride"
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                isRequired
            />

            <Autocomplete
                allowsCustomValue
                label="Meeting point"
                size="lg"
                placeholder={`e.g. ${defaultLocations[0]}`}
                inputValue={formData.location}
                defaultItems={defaultLocations.map(loc => ({ loc }))}
                onInputChange={handleValueChange('location')}
                isRequired
            >
                {(item) => <AutocompleteItem key={item.loc}>{item.loc}</AutocompleteItem>}
            </Autocomplete>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <DatePicker label="Date" size="lg" isRequired value={formData.date}
                    onChange={d => setFormData(prevState => ({
                        ...prevState,
                        date: d as CalendarDate
                    }))}
                    minValue={today(getLocalTimeZone())} />
                <TimeInput label="Start time" isRequired value={formData.time}
                    size="lg"
                    onChange={t => setFormData(prevState => ({
                        ...prevState,
                        time: t as Time
                    }))}
                />

                <Select
                    name="duration"
                    size="lg"
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
                size="lg"
                isRequired
            />

            <Input
                label="Link to the route"
                placeholder="Strava or RideWithGPS route link"
                size="lg"
                name="routeLink"
                type="url"
                pattern={`https\://(www\.)?(strava\.com/routes/\\d{6,}|ridewithgps.com/routes/\\d{6,})`}
                value={formData.routeLink}
                onChange={handleChange}
                errorMessage="Please enter a valid Strava or RideWithGPS route link"
            />

            <div className="flex flex-col gap-1 w-full">
                <SelectableTags
                    value={formData.tags}
                    onChange={handleValueChange('tags')}
                    label="Select event type"
                    isRequired
                    errorMessage="Please select at least one"
                />
            </div>

            <Button type="submit" color="primary">
                {event ? 'Save' : 'Create Event'}
            </Button>
        </form >
    )
}