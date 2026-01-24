'use server'

import { cookies } from 'next/headers'
import { getAdminApp } from '@/lib/firebase/serverApp'
import { logRequest } from '@/lib/logging'

const SESSION_EXPIRY = 60 * 60 * 24 * 7 * 1000 // 7 days in milliseconds

export async function createSession(idToken: string) {
    try {
        const auth = getAdminApp().auth()
        const sessionCookie = await auth.createSessionCookie(idToken, {
            expiresIn: SESSION_EXPIRY
        })

        const cookieStore = await cookies()
        cookieStore.set('__session', sessionCookie, {
            maxAge: SESSION_EXPIRY / 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        })

        logRequest(sessionCookie, { action: 'createSession' })

        return { success: true }
    } catch (error) {
        console.error('Error creating session cookie:', error)
        return { success: false, error: 'Failed to create session' }
    }
}

export async function deleteSession() {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('__session')?.value

    logRequest(sessionCookie, { action: 'deleteSession' })

    cookieStore.delete('__session')
    return { success: true }
}
