'use client'

import Link from "next/link"
import { useState } from "react"
import { Button, ButtonGroup } from "@heroui/button"
import { ChevronDownIcon, DocumentDuplicateIcon, PencilIcon, TrashIcon, UsersIcon, XCircleIcon } from "@heroicons/react/24/outline"
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/dropdown"
import TransferOwnerDrawer from "./TransferOwnerDrawer"
import DuplicateEventDrawer from "./DuplicateEventDrawer"
import { useCancelEvent } from "./useCancelEvent"
import DeleteEventDrawer from "./DeleteEventDrawer"

interface EditButtonsProps {
    eventId: string
    isCancelled: boolean
}

export default function EditButtons({ eventId, isCancelled }: EditButtonsProps) {
    const [transferOpen, setTransferOpen] = useState(false)
    const [duplicateOpen, setDuplicateOpen] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const { handleCancel } = useCancelEvent(eventId, isCancelled)

    return (
        <>
            <ButtonGroup className="mb-4">
                <Button href={`/events/${eventId}/edit`}
                    as={Link}
                    startContent={<PencilIcon height={18} />}>
                    Edit
                </Button>
                <Dropdown>
                    <DropdownTrigger>
                        <Button variant="bordered">More<ChevronDownIcon width={24} /></Button>
                    </DropdownTrigger>
                    <DropdownMenu>
                        <DropdownItem
                            key="transfer"
                            startContent={<UsersIcon height={18} />}
                            onPress={() => setTransferOpen(true)}
                        >
                            Transfer
                        </DropdownItem>
                        <DropdownItem
                            key="duplicate"
                            startContent={<DocumentDuplicateIcon height={18} />}
                            onPress={() => setDuplicateOpen(true)}
                        >
                            Duplicate
                        </DropdownItem>
                        <DropdownItem
                            key="cancel"
                            className="text-danger" color="danger"
                            startContent={<XCircleIcon height={18} />}
                            onPress={handleCancel}
                        >
                            {isCancelled ? "Uncancel" : "Cancel"}
                        </DropdownItem>
                            <DropdownItem
                                key="delete"
                                className="text-danger" color="danger"
                                startContent={<TrashIcon height={18} />}
                                onPress={() => setDeleteOpen(true)}
                            >
                                Delete
                        </DropdownItem>
                    </DropdownMenu>
                </Dropdown>
            </ButtonGroup>

            <TransferOwnerDrawer eventId={eventId} isOpen={transferOpen} onOpenChange={setTransferOpen} />
            <DuplicateEventDrawer eventId={eventId} isOpen={duplicateOpen} onOpenChange={setDuplicateOpen} />
            <DeleteEventDrawer eventId={eventId} isOpen={deleteOpen} onOpenChange={setDeleteOpen} />
        </>
    )
}
