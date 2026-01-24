'use client'
import { useState, useEffect, useRef } from 'react'
import { User } from 'firebase/auth'
import { onIdTokenChanged } from '@/lib/firebase/auth'
import { createSession, deleteSession } from '../../app/sessionActions'

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const userRef = useRef<User | null>(null)

    async function updateUser(firebaseUser: User | null) {
        userRef.current = firebaseUser

        if (firebaseUser) {
            const idToken = await firebaseUser.getIdToken()
            await createSession(idToken)
            setUser(firebaseUser)
        } else {
            await deleteSession()
            setUser(null)
        }

        setLoading(false)
    }

    useEffect(() => {
        const timeout = setTimeout(() => {
            setLoading(false)
        }, 5000)

        const unsubscribe = onIdTokenChanged((firebaseUser) => {
            clearTimeout(timeout)
            updateUser(firebaseUser)
        })

        // Refresh session cookie every 55 minutes to keep it fresh for active users
        const refreshInterval = setInterval(async () => {
            if (userRef.current) {
                const idToken = await userRef.current.getIdToken(true)
                await createSession(idToken)
            }
        }, 55 * 60 * 1000)

        return () => {
            clearTimeout(timeout)
            clearInterval(refreshInterval)
            unsubscribe()
        }
    }, [])

    return { user, loading, isAuthenticated: !!user }
}