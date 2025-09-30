"use client"

import React, { useState } from "react"
import { Button } from "@heroui/button"
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/drawer"
import { DocumentDuplicateIcon } from "@heroicons/react/24/outline"
import EventDuplicator from "./DuplicateEvent"

interface Props {
    eventId: string
}

export default function DuplicateEventButton({ eventId }: Props) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <Button
                onPress={() => setOpen(!open)}
                startContent={<DocumentDuplicateIcon height={18} />}
            >
                Duplicate
            </Button>
            <Drawer
                placement="bottom"
                size="sm"
                isOpen={open}
                onOpenChange={setOpen}
                isDismissable
            >
                <DrawerContent>
                    {(onClose) => <>
                        <DrawerHeader>Duplicate event</DrawerHeader>
                        <DrawerBody>
                            <EventDuplicator eventId={eventId} onSubmit={onClose} />
                        </DrawerBody>
                    </>}
                </DrawerContent>
            </Drawer>
        </>
    )
}
