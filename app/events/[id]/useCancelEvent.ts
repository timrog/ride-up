'use client'

import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/clientApp"

export async function cancelEvent(id: string, isCancelled: boolean) {
    const event = doc(db, 'events', id)
    await updateDoc(event, { isCancelled })
    return true
}

export function useCancelEvent(eventId: string, isCancelled: boolean) {
    async function handleCancel() {
        try {
            await cancelEvent(eventId, !isCancelled)
        } catch (error) {
            console.error("Failed to cancel event:", error)
        }
    }

    return { handleCancel }
}
