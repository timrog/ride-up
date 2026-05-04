'use client'
import { getAuth, IdTokenResult } from "firebase/auth"
import { MemberRole } from "./types"
import { useEffect, useState } from "react"
import { createSession, deleteSession } from "./sessionActions"

type AuthState = {
    currentUser: ReturnType<typeof getAuth>["currentUser"]
    idToken: IdTokenResult | null
    loading: boolean
}

const listeners = new Set<() => void>()
let isInitialized = false
let hasLoadedLocalStorage = false
let authState: AuthState = {
    currentUser: getAuth().currentUser,
    idToken: null,
    loading: true,
}

function emit() {
    listeners.forEach(listener => listener())
}

function readSessionIssuedAt(): number {
    if (typeof window === 'undefined') return 0
    const value = Number(localStorage.getItem('sessionIssuedAt') ?? 0)
    return Number.isFinite(value) ? value : 0
}

async function syncServerSession(idTokenResult: IdTokenResult | null) {
    if (typeof window === 'undefined') return

    if (!hasLoadedLocalStorage) {
        hasLoadedLocalStorage = true
    }

    if (idTokenResult) {
        const issuedAt = new Date(idTokenResult.issuedAtTime).getTime()
        const lastIssuedAt = readSessionIssuedAt()

        if (issuedAt > lastIssuedAt) {
            await createSession(idTokenResult.token)
            localStorage.setItem('sessionIssuedAt', String(issuedAt))
        }

        return
    }

    await deleteSession()
    localStorage.removeItem('sessionIssuedAt')
}

function ensureInitialized() {
    if (isInitialized) return
    isInitialized = true

    const auth = getAuth()
    const timeout = setTimeout(() => {
        authState = { ...authState, loading: false }
        emit()
    }, 5000)

    auth.onIdTokenChanged(async user => {
        clearTimeout(timeout)

        let idToken: IdTokenResult | null = null
        if (user) {
            idToken = await user.getIdTokenResult()
        }

        try {
            await syncServerSession(idToken)
        } catch (error) {
            console.error('Failed to synchronize auth session', error)
        }

        authState = {
            currentUser: user,
            idToken,
            loading: false,
        }
        emit()
    })
}

export function useClientAuthState() {
    const [state, setState] = useState(authState)

    useEffect(() => {
        ensureInitialized()
        const handleChange = () => setState(authState)
        listeners.add(handleChange)
        handleChange()

        return () => {
            listeners.delete(handleChange)
        }
    }, [])

    return state
}

export function useRoles() {
    const { currentUser, idToken, loading } = useClientAuthState()

    return {
        roles: (idToken?.claims['roles'] || []) as MemberRole[],
        currentUser,
        idToken,
        loading,
    }
}
