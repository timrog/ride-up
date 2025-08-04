'use server'
import { revalidatePath } from 'next/cache'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/clientApp'

export async function addComment(eventId: string, comment: string, userId: string) {
    // TODO: Implement logic to add comment to the database
    // Example:
    // await db.comment.create({ data: { eventId, comment, userId } });

    return { success: true }
}

