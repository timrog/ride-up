'use server'

import { getAuthenticatedAppForUser } from '@/lib/firebase/serverApp'
import { PubSub } from '@google-cloud/pubsub'

export async function refreshMembership() {
    try {
        const { currentUser } = await getAuthenticatedAppForUser()
        if (!currentUser) {
            return { success: false, error: 'Not authenticated' }
        }

        const pubsub = new PubSub({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        })
        const topic = pubsub.topic('refresh-members')

        await topic.publishMessage({
            json: { email: currentUser.email }
        })

        console.info('Triggered membership refresh for', currentUser.email)
        return { success: true }
    } catch (error) {
        console.error('Error publishing refresh-members message:', error)
        throw error
    }
}
