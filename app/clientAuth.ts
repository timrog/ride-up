'use client'
import { getAuth, IdTokenResult } from "firebase/auth"
import { MemberRole } from "./types"
import { useEffect, useState } from "react"

export function useRoles() {
    const [idToken, setIdToken] = useState<IdTokenResult | null>(null)
    const [currentUser, setCurrentUser] = useState(getAuth().currentUser)

    useEffect(() => {
        const auth = getAuth()

        const unsubscribeAuth = auth.onAuthStateChanged((user) => {
            setCurrentUser(user)
        })

        const unsubscribeToken = auth.onIdTokenChanged((user) => {
            if (user) {
                user.getIdTokenResult().then(setIdToken)
            } else {
                setIdToken(null)
            }
        })

        return () => {
            unsubscribeAuth()
            unsubscribeToken()
        }
    }, [])

    return { roles: (idToken?.claims['roles'] || []) as MemberRole[], currentUser, idToken }
}
