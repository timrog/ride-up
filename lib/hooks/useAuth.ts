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
            const tokenResult = await firebaseUser.getIdTokenResult()
            const issuedAt = new Date(tokenResult.issuedAtTime).getTime()
            const lastIssuedAt = Number(localStorage.getItem('sessionIssuedAt') ?? 0)
            if (issuedAt > lastIssuedAt) {
                await createSession(tokenResult.token)
                localStorage.setItem('sessionIssuedAt', String(issuedAt))
            }
            setUser(firebaseUser)
        } else {
            await deleteSession()
            localStorage.removeItem('sessionIssuedAt')
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

        return () => {
            clearTimeout(timeout)
            unsubscribe()
        }
    }, [])

    return { user, loading, isAuthenticated: !!user }
}