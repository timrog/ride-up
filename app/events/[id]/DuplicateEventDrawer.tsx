"use client"

import React, { useState } from "react"
import { duplicateEvent } from "../../serverActions"
import { Button, RadioGroup, Radio, DatePicker, Spinner, addToast } from "@heroui/react"
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from "@heroui/drawer"
import { today, getLocalTimeZone, DateValue } from "@internationalized/date"

type DuplicateMode = "single" | "weekly"

interface DuplicateEventDrawerProps {
    eventId: string
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

interface FormState {
    mode: DuplicateMode
    targetDate: DateValue | null
    untilDate: DateValue | null
    maxOccurrences: string
    error?: string | null
    success?: string | null
}

export default function DuplicateEventDrawer({ eventId, isOpen, onOpenChange }: DuplicateEventDrawerProps) {
    const [submitting, setSubmitting] = useState(false)
    const [form, setForm] = useState<FormState>(() => ({
        mode: "single",
        targetDate: null,
        untilDate: null,
        maxOccurrences: "12",
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

            onOpenChange(false)
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
        <Drawer
            placement="bottom"
            size="sm"
            classNames={{ "wrapper": "max-w-lg mx-auto" }}
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            isDismissable
        >
            <DrawerContent>
                {(onClose) => (
                    <form onSubmit={handleSubmit}>
                        <DrawerHeader>Duplicate event</DrawerHeader>
                        <DrawerBody>
                            <div className="flex flex-col gap-4">
                                <RadioGroup
                                    label="Duplication mode"
                                    orientation="horizontal"
                                    value={form.mode}
                                    onValueChange={val => handleModeChange(val as DuplicateMode)}
                                >
                                    <Radio value="single">Single date</Radio>
                                    <Radio value="weekly">Every week until...</Radio>
                                </RadioGroup>

                                <DatePicker
                                    label="Target date"
                                    aria-label="Target date"
                                    value={form.targetDate as any}
                                    minValue={minDate}
                                    maxValue={maxDate}
                                    onChange={handleTargetDateChange}
                                    isRequired
                                />

                                {form.error && <p className="text-danger text-sm">{form.error}</p>}
                                {form.success && <p className="text-success text-sm">{form.success}</p>}
                            </div>
                        </DrawerBody>
                        <DrawerFooter>
                            <Button onPress={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" color="primary" isDisabled={submitting}>
                                {submitting && <Spinner size="sm" className="mr-1" />}
                                Duplicate
                            </Button>
                        </DrawerFooter>
                    </form>
                )}
            </DrawerContent>
        </Drawer >
    )
}
