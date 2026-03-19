'use server'

import { getAuthenticatedAppForUser } from '@/lib/firebase/serverApp'
import { PubSub } from '@google-cloud/pubsub'

type RefreshMembershipResult = {
    success: boolean
    error?: string
}

export async function refreshMembership(): Promise<RefreshMembershipResult> {
    try {
        const { currentUser } = await getAuthenticatedAppForUser()

        const pubsub = new PubSub({
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        })
        const topic = pubsub.topic('refresh-members')

        const payload = currentUser?.email ? { email: currentUser.email } : {}

        await topic.publishMessage({
            json: payload
        })

        if (currentUser?.email) {
            console.info('Triggered membership refresh for', currentUser.email)
        } else {
            console.info('Triggered membership refresh without an authenticated user')
        }

        return { success: true }
    } catch (error) {
        console.error('Error publishing refresh-members message:', error)
        return {
            success: false,
            error: 'Failed to trigger membership refresh.',
        }
    }
}
