'use client'
import { useEffect } from 'react'
import { setCookie, deleteCookie } from "cookies-next"
import {
    signInWithGoogle,
    signOut,
    onIdTokenChanged,
} from "@/lib/firebase/auth"

function useUserSession(initialUser) {
    useEffect(() => {
        return onIdTokenChanged(async (user) => {
            console.log("id token changed")
            if (user) {
                const idToken = await user.getIdToken()
                await setCookie("__session", idToken)
            } else {
                await deleteCookie("__session")
            }
            if (initialUser?.uid === user?.uid) {
                return
            }
            window.location.reload()
        })
    }, [initialUser])

    return initialUser
}

export default function FirebaseAuth({ initialUser }) {
    const user = useUserSession(initialUser)
    const handleSignOut = (event) => {
        event.preventDefault()
        signOut()
    }

    const handleSignIn = (event) => {
        event.preventDefault()
        signInWithGoogle()
    }

    return (
        <header>
            {user ? (
                <>
                    <div className="profile">
                        <p>
                            <img
                                className="profileImage"
                                src={user.photoURL || "/profile.svg"}
                                alt={user.email}
                            />
                            {user.displayName}
                        </p>

                        <div className="menu">
                            ...
                            <ul>
                                <li>{user.displayName}</li>

                                <li>
                                    <a href="#" onClick={handleSignOut}>
                                        Sign Out
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </>
            ) : (
                <div className="profile">
                    <a href="#" onClick={handleSignIn}>
                        <img src="/profile.svg" alt="A placeholder user image" />
                        Sign In with Google
                    </a>
                </div>
            )}
        </header>
    )

}