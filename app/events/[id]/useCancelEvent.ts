'use client'

import { useRouter } from "next/navigation"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/clientApp"

export async function cancelEvent(id: string, isCancelled: boolean) {
    const event = doc(db, 'events', id)
    await updateDoc(event, { isCancelled })
    return true
}

export function useCancelEvent(eventId: string, isCancelled: boolean) {
    const router = useRouter()

    async function handleCancel() {
        try {
            await cancelEvent(eventId, !isCancelled)
            router.refresh()
        } catch (error) {
            console.error("Failed to cancel event:", error)
        }
    }

    return { handleCancel }
}
