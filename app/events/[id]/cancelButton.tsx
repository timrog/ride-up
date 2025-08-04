'use client'

import { Button } from "@heroui/button"
import { XCircleIcon } from "@heroicons/react/24/outline"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/clientApp"

export async function cancelEvent(id: string) {
    console.log(`Cancelling event with ID: ${id}`)
    const event = doc(db, 'events', id)
    await updateDoc(event, { isCancelled: true })
    return true
}

export default function CancelButton(props: { id: string, isCancelled?: boolean }) {
    const [isLoading, setIsLoading] = useState(false)
    const [isCancelled, setIsCancelled] = useState(props.isCancelled || false)
    const router = useRouter()

    async function handleCancel() {
        setIsLoading(true)
        try {
            await cancelEvent(props.id)
            // Force refresh the current page
            router.refresh()
        } catch (error) {
            console.error("Failed to cancel event:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Button
            color="danger"
            isLoading={isLoading}
            onPress={handleCancel}
            startContent={!isLoading && <XCircleIcon height={18} />}
        >
            Cancel
        </Button>
    )
}
