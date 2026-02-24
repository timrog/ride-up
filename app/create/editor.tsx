import { Alert, Autocomplete, AutocompleteItem, Button, DatePicker, Input, Select, SelectItem, Textarea, TimeInput } from "@heroui/react"
import { CalendarEvent } from "app/types"
import { getAuth } from "firebase/auth"
import { Timestamp } from "firebase/firestore"
import React, { ChangeEvent, createContext, useContext, useEffect, useState } from "react"
import SelectableTags from "@/components/SelectableTags"

import { CalendarDate, DateValue, fromDate, getLocalTimeZone, Time, toCalendarDate, toCalendarDateTime, today, toTime } from "@internationalized/date"
import { defaultLocations } from "app/tags"
import { XCircleIcon } from "@heroicons/react/24/outline"
import { IconInline, IconLine } from "@/components/IconLine"
import { useCancelEvent } from "app/events/[id]/useCancelEvent"
import { useRefresh } from "app/providers"

const UK_POSTCODE_REGEX = /[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i

type FormDataType = {
    date: DateValue | undefined
    time: Time | undefined
    duration: string
    title: string
    description: string
    routeLink: string
    location: string
    tags: string[]
    isCancelled?: boolean
}

type DraftContextType = {
    draft: FormDataType | null
    setDraft: (data: FormDataType) => void
    clearDraft: () => void
}

const DraftEventContext = createContext<DraftContextType>({
    draft: null,
    setDraft: () => { },
    clearDraft: () => { }
})

export function DraftEventProvider({ children }: { children: React.ReactNode }) {
    const [draft, setDraftState] = useState<FormDataType | null>(null)
    return (
        <DraftEventContext.Provider value={{
            draft,
            setDraft: setDraftState,
            clearDraft: () => setDraftState(null)
        }}>
            {children}
        </DraftEventContext.Provider>
    )
}

export function useDraftEvent() {
    return useContext(DraftEventContext)
}

export default function EventForm({ event, onSubmit }
    : { event?: CalendarEvent, onSubmit: (event: Partial<CalendarEvent>) => void }) {

    const { draft, setDraft, clearDraft } = useDraftEvent()

    const initialFormData: FormDataType = event ? {
        title: event.title,
        date: toCalendarDate(fromDate(event.date.toDate(), getLocalTimeZone())),
        time: toTime(fromDate(event.date.toDate(), getLocalTimeZone())),
        duration: event.duration?.toString() || '180',
        description: event.description || '',
        routeLink: event.routeLink || '',
        location: event.location || '',
        tags: event.tags || [],
        isCancelled: event.isCancelled || false
    } : draft ?? {
        title: '',
        date: undefined,
        time: undefined,
        duration: '180',
        description: '',
        routeLink: '',
        location: '',
        tags: []
    }

    const [formData, setFormData] = useState<FormDataType>(initialFormData)

    useEffect(() => {
        if (!event) setDraft(formData)
    }, [formData])

    const { invalidate } = useRefresh()

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
            clearDraft()
        }
        onSubmit(newDoc)
    }

    const handleValueChange = <K extends keyof FormDataType>(name: K) => (value: FormDataType[K]) =>
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

            <div>
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
                {formData.location && !UK_POSTCODE_REGEX.test(formData.location) && (
                    <Alert>
                        Hint: add a postcode to help riders find the meeting point.
                    </Alert>
                )}
            </div>
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

            <div className="flex flex-row gap-1 w-full">
                <Button type="submit" color="primary">
                    {event ? 'Save' : 'Create Event'}
                </Button>

                {event && !event.isCancelled &&
                    <Button type="submit" color="danger" onPress={() => handleValueChange('isCancelled')(true)} className="ml-auto">
                        <XCircleIcon height={18} />Cancel event
                    </Button>
                }
            </div>
        </form >
    )
}