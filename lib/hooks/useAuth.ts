'use client'
import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { onIdTokenChanged, onAuthStateChanged } from '@/lib/firebase/auth'
import { setCookie, deleteCookie } from "cookies-next"

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    async function updateUser(firebaseUser: User | null) {
        if (firebaseUser) {
            const idToken = await firebaseUser.getIdToken()

            await setCookie("__session", idToken, {
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production'
            })
            setUser(firebaseUser)
        } else {
            await deleteCookie("__session")
            setUser(null)
        }

        setLoading(false)
    }

    useEffect(() => {
        const unsubscribe = onIdTokenChanged(updateUser)

        return unsubscribe
    }, [])

    return { user, loading, isAuthenticated: !!user }
}