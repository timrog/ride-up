import { Button, CheckboxGroup, Chip, DatePicker, Input, Select, SelectItem, Textarea, TimeInput, tv, useCheckbox, VisuallyHidden } from "@heroui/react"
import { CalendarEvent } from "app/types"
import { getAuth } from "firebase/auth"
import { Timestamp } from "firebase/firestore"
import React, { ChangeEvent, useState } from "react"

import { CalendarDate, DateValue, fromDate, getLocalTimeZone, Time, toCalendarDate, toCalendarDateTime, today, toTime, ZonedDateTime } from "@internationalized/date"
import { get } from "http"
import { I18nProvider } from "@react-aria/i18n"

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

    const allTags = ['Intro', 'Social', 'Social Mod', 'Mod', 'Mod+', 'Pacy', 'Race', 'Women-only', 'Triathlon', 'Gravel', 'MTB', 'Social event', 'Meeting', 'Swim', 'Run', 'Jets']

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

    const CustomCheckbox = (props) => {
        const checkbox = tv({
            slots: {
                base: "border-none hover:bg-default-200",
                content: "text-default-500",
            },
            variants: {
                isSelected: {
                    true: {
                        base: "border-none bg-primary hover:bg-primary-500",
                        content: "text-primary-foreground",
                    },
                },
                isFocusVisible: {
                    true: {
                    },
                },
            },
        })

        const { children, isSelected, isFocusVisible, getBaseProps, getLabelProps, getInputProps } =
            useCheckbox({
                ...props,
            })

        const styles = checkbox({ isSelected, isFocusVisible })

        return (
            <label {...getBaseProps()}>
                <VisuallyHidden>
                    <input {...getInputProps()} />
                </VisuallyHidden>
                <Chip
                    classNames={{
                        base: styles.base(),
                        content: styles.content(),
                    }}
                    color="primary"
                    variant="faded"
                    {...getLabelProps()}
                >
                    {children}
                </Chip>
            </label>
        )
    }

    function handleSetTags(value: string[]): void {
        setFormData(prevState => ({
            ...prevState,
            tags: value
        }))
    }

    return (
        <I18nProvider locale="en-GB">
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    <DatePicker label="Date" isRequired value={formData.date}
                        onChange={d => setFormData(prevState => ({
                            ...prevState,
                            date: d as CalendarDate
                        }))}
                        minValue={today(getLocalTimeZone())} />
                    <TimeInput label="Start time" isRequired value={formData.time}
                        onChange={t => setFormData(prevState => ({
                            ...prevState,
                            time: t as Time
                        }))}
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

                <div className="flex flex-col gap-1 w-full">
                    <CheckboxGroup
                        className="gap-1"
                        label="Select event type"
                        orientation="horizontal"
                        value={formData.tags}
                        onChange={handleSetTags}
                        isRequired
                        errorMessage="Please select at least one"
                    >
                        {allTags.map(tag => <CustomCheckbox value={tag}>{tag}</CustomCheckbox>)}
                    </CheckboxGroup>
                </div>

                <Button
                    type="submit" color="primary"
                >
                    {event ? 'Save' : 'Create Event'}
                </Button>
            </form >
        </I18nProvider>
    )
}