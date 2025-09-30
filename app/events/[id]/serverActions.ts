'use server'
import { revalidatePath } from 'next/cache'
import { doc, getDoc, addDoc, collection, Timestamp, updateDoc } from 'firebase/firestore'
import { CalendarEvent } from '../../types'
import { getAuthenticatedAppForUser } from "@/lib/firebase/serverApp"

type DuplicateMode = 'single' | 'weekly'

interface DuplicateParams {
    eventId: string
    mode: DuplicateMode
    date: string
}

function addDays(base: Date, days: number) {
    const d = new Date(base.getTime())
    d.setDate(d.getDate() + days)
    return d
}

export async function duplicateEvent(params: DuplicateParams) {

    const { db } = await getAuthenticatedAppForUser()

    console.log('Current event in duplicateEvent:', params.eventId)
    const { eventId, mode, date } = params

    console.log('getting doc', eventId)
    const snap = await getDoc(doc(db, 'events', eventId))
    console.log('Event snapshot:', snap.exists(), snap.data())
    if (!snap.exists()) {
        return { success: false, error: 'Source event not found' }
    }
    const source = snap.data() as CalendarEvent
    const sourceDate = source.date.toDate()
    const targetDate = new Date(date)

    let targetDates: Date[] = []
    if (mode === 'single') {
        targetDates = [targetDate]
    } else {
        let current = sourceDate
        let count = 0
        const limit = 52
        while (current.getTime() <= targetDate.getTime() && count++ < limit) {
            targetDates.push(current)
            current = addDays(current, 7)
        }
    }

    console.log('Duplicating to dates:', targetDates)
    const batchResults: string[] = []
    await Promise.all(targetDates.map(d => {
        const newDoc: Omit<CalendarEvent, 'id'> = {
            ...source,
            isCancelled: false,
            date: Timestamp.fromDate(d),
            createdAt: Timestamp.now(),
            linkId: source.linkId || eventId,
        }
        return addDoc(collection(db, 'events'), newDoc)
    }))

    if (source.linkId !== eventId) {
        console.log('updating link id')

        await updateDoc(doc(db, 'events', eventId), { linkId: eventId })
    }

    revalidatePath(`/events/${eventId}`)
    return { success: true, created: batchResults }
}

export async function addComment(eventId: string, comment: string, userId: string) {
    // TODO: Implement logic to add comment to the database
    // Example:
    // await db.comment.create({ data: { eventId, comment, userId } });

    return { success: true }
}

