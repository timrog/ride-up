"use client"

import React, { useState } from "react"
import { duplicateEvent } from "./serverActions"
import {
    Button,
    RadioGroup,
    Radio,
    DatePicker,
    Spinner,
    Form,
    addToast,
} from "@heroui/react"
import {
    today,
    getLocalTimeZone,
    DateValue,
} from "@internationalized/date"
import { I18nProvider } from "@react-aria/i18n"

type DuplicateMode = "single" | "weekly"

export interface DuplicatorProps {
    eventId: string
    defaultMode?: DuplicateMode
    onSubmit?: () => void
}

interface FormState {
    mode: DuplicateMode
    targetDate: DateValue | null
    untilDate: DateValue | null
    maxOccurrences: string
    error?: string | null
    success?: string | null
}

// No source event data on client now; server action derives source fields.

export const EventDuplicator: React.FC<DuplicatorProps> = ({ eventId, onSubmit, defaultMode = "single" }) => {
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState<FormState>(() => ({
        mode: defaultMode,
        targetDate: null,
        untilDate: null,
        maxOccurrences: "12", // safeguard upper bound
        error: null,
        success: null,
    }))

    const handleModeChange = (val: DuplicateMode) => setForm(f => ({ ...f, mode: val }))
    const handleTargetDateChange = (val: DateValue) => setForm(f => ({ ...f, targetDate: val, error: null, success: null }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        setForm(f => ({ ...f, error: null, success: null }))
        try {
            const payload = {
                eventId,
                mode: form.mode,
                date: form.targetDate!.toString()
            }
            const res = await duplicateEvent(payload)
            if (!res.success) {
                throw new Error((res as any).error || 'Failed to duplicate')
            }

            addToast({
                title: "Success",
                description: "Event was duplicated."
            })

            onSubmit?.()
        } catch (err: any) {
            console.error('Duplication error:', err)
            addToast({
                title: "Oh no",
                description: "Duplication failed.",
                color: "danger"
            })
            setSubmitting(false)
        }
    }

    const minDate = today(getLocalTimeZone())
    const maxDate = minDate.add({ months: 12 })

    return (
        <Form onSubmit={handleSubmit}>
            <I18nProvider locale="en-GB">
                <RadioGroup
                    label="Duplication mode"
                    orientation="horizontal"
                    value={form.mode}
                    onValueChange={val => handleModeChange(val as DuplicateMode)}
                >
                    <Radio value="single">Single date</Radio>
                    <Radio value="weekly">Every week until...</Radio>
                </RadioGroup>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DatePicker
                        label="Target date"
                        aria-label="Target date"
                        value={form.targetDate as any}
                        minValue={minDate}
                        maxValue={maxDate}
                        onChange={handleTargetDateChange}
                        isRequired
                    />
                </div>

                {form.error && <p className="text-danger text-sm">{form.error}</p>}
                {form.success && <p className="text-success text-sm">{form.success}</p>}
                <div className="flex items-center gap-4">
                    <Button type="submit" color="primary" isDisabled={submitting}>
                        {submitting && <Spinner size="sm" className="mr-1" />}
                        Duplicate
                    </Button>
                </div>
            </I18nProvider>
        </Form>
    )
}

export default EventDuplicator

