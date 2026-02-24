'use client'

import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/clientApp"
import { useRefresh } from "app/providers"

export async function cancelEvent(id: string, isCancelled: boolean) {
    const event = doc(db, 'events', id)
    await updateDoc(event, { isCancelled })
    return true
}

export function useCancelEvent(eventId: string, isCancelled: boolean) {
    const { invalidate } = useRefresh()
    async function handleCancel() {
        try {
            await cancelEvent(eventId, !isCancelled)
            invalidate()
        } catch (error) {
            console.error("Failed to cancel event:", error)
        }
    }

    return { handleCancel }
}
