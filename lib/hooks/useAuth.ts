'use client'
import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { onIdTokenChanged } from '@/lib/firebase/auth'
import { setCookie, deleteCookie } from "cookies-next"

export function useAuth() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onIdTokenChanged(async (firebaseUser) => {
            if (firebaseUser) {
                const idToken = await firebaseUser.getIdToken()
                console.log('Id token has changed')
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
        })

        return unsubscribe
    }, [])

    return { user, loading, isAuthenticated: !!user }
}