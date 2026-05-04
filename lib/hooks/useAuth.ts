'use client'
import { useClientAuthState } from '../../app/clientAuth'

export function useAuth() {
    const { currentUser, loading } = useClientAuthState()
    return { user: currentUser, loading, isAuthenticated: !!currentUser }
}