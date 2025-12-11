"use client"

import React, { useState } from "react"
import { Button, Spinner } from "@heroui/react"
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from "@heroui/drawer"
import { useRouter } from "next/navigation"
import { doc, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/initFirebase"

interface DeleteEventDrawerProps {
    eventId: string
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export default function DeleteEventDrawer({ eventId, isOpen, onOpenChange }: DeleteEventDrawerProps) {
    const [submitting, setSubmitting] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)

        try {
            await deleteDoc(doc(db, 'events', eventId))
            router.push('/')
        } catch (error) {
            console.error('Error deleting event:', error)
        } finally {
            setSubmitting(false)
        }
    }

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
                        <DrawerHeader>Delete event</DrawerHeader>
                        <DrawerBody>
                            Are you sure you want to delete this event?

                            Anyone signed up will not be notified. If anyone is signed up, it's better to cancel the event.
                        </DrawerBody>
                        <DrawerFooter>
                            <Button onPress={onClose}>
                                No
                            </Button>
                            <Button type="submit" color="danger" isDisabled={submitting}>
                                {submitting && <Spinner size="sm" className="mr-1" />}
                                Yes, delete
                            </Button>
                        </DrawerFooter>
                    </form>
                )}
            </DrawerContent>
        </Drawer>
    )
}
