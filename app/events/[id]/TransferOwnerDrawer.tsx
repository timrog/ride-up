'use client'

import { useState, useEffect } from "react"
import { addToast, Alert, Autocomplete, AutocompleteItem, Button, Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from "@heroui/react"
import { getLeaders } from "../../serverActions"
import WithAuth from "app/withAuthClient"
import { db } from "@/lib/firebase/initFirebase"
import { doc, updateDoc } from "@firebase/firestore"
import { CalendarEvent } from "app/types"
import { useRouter } from "next/navigation"

interface Leader {
    uid: string
    displayName: string
    email?: string
}

interface TransferOwnerDrawerProps {
    eventId: string
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export default function TransferOwnerDrawer({ eventId, isOpen, onOpenChange }: TransferOwnerDrawerProps) {
    const [leaders, setLeaders] = useState<Leader[]>([])
    const [selectedLeader, setSelectedLeader] = useState<string>('')
    const [isLoading, setIsLoading] = useState(false)
    const [isTransferring, setIsTransferring] = useState(false)
    const router = useRouter()

    useEffect(() => {
        if (isOpen && leaders.length === 0) {
            loadLeaders()
        }
    }, [isOpen])

    const loadLeaders = async () => {
        setIsLoading(true)
        try {
            const result = await getLeaders()
            if (result.success && result.leaders) {
                setLeaders(result.leaders)
            }
        } catch (error) {
            console.error('Error loading leaders:', error)
        } finally {
            setIsLoading(false)
        }
    }

    async function transferEventOwnership(eventId: string, newOwnerId: string, newOwnerName: string): Promise<void> {
        const updates: Partial<CalendarEvent> = {
            createdBy: newOwnerId,
            createdByName: newOwnerName
        }
        await updateDoc(doc(db, "events", eventId), updates)
    }

    const handleTransfer = async () => {
        if (!selectedLeader) return

        const leader = leaders.find(l => l.uid === selectedLeader)
        if (!leader) return

        setIsTransferring(true)
        try {
            await transferEventOwnership(eventId, leader.uid, leader.displayName)

            addToast({
                title: "Ownership transferred",
                color: "success"
            })
            onOpenChange(false)
            router.refresh()
            setSelectedLeader('')
        } catch (error) {
            console.error('Error transferring ownership:', error)
            addToast({
                title: "Transfer failed",
                color: "danger"
            })
        } finally {
            setIsTransferring(false)
        }
    }

    return (
        <Drawer
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            classNames={{ "wrapper": "max-w-lg mx-auto" }}
            size="md"
            placement="bottom"
            isDismissable
        >
            <DrawerContent>
                <DrawerHeader>Transfer to another leader</DrawerHeader>
                <DrawerBody>
                    <WithAuth except role="member">
                        <Alert color="warning" className="mb-4">
                            Warning: transferring ownership will mean you will no longer be able to edit this event.
                        </Alert>
                    </WithAuth>

                    <Autocomplete
                        label="Select Leader"
                        placeholder="Choose a leader"
                        onSelectionChange={key => setSelectedLeader(key as string)}
                        selectedKey={selectedLeader}
                        isLoading={isLoading}
                        isDisabled={isLoading}
                    >
                        {leaders.map((leader) => (
                            <AutocompleteItem key={leader.uid}>
                                {leader.displayName}
                            </AutocompleteItem>
                        ))}
                    </Autocomplete>
                </DrawerBody>
                <DrawerFooter>
                    <Button
                        onPress={() => onOpenChange(false)}
                        isDisabled={isTransferring}
                    >
                        Cancel
                    </Button>
                    <Button
                        color="danger"
                        onPress={handleTransfer}
                        isDisabled={!selectedLeader || isTransferring}
                        isLoading={isTransferring}
                    >
                        Transfer Ownership
                    </Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
