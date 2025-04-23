'use client'
import { useEffect } from 'react'
import { setCookie, deleteCookie } from "cookies-next"
import {
    signInWithGoogle,
    signOut,
    onIdTokenChanged,
} from "@/lib/firebase/auth"
import { NavDropdown } from "react-bootstrap"
import { User } from "firebase/auth"

function useUserSession(initialUser: User) {
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

const ProfileImage = (props) => (
    <span>
        <img {...props} />
        <style jsx>{`
            img {
                object-fit: cover;
                width: 2.5rem;
                height: 2.5rem;
                border-radius: 50%;
            }
        `}</style>
    </span>
)

export default function FirebaseAuth({ initialUser }: { initialUser: User }) {
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
        <NavDropdown
            className="flex-grow-1"
            title={
                <ProfileImage
                    className="profileImage"
                    src={user ? user.photoURL || "/profile.svg" : "/profile.svg"}
                    alt={user ? user.email : "A placeholder user image"}
                />
            }
        >
            {user ? (
                <>
                    <NavDropdown.Item disabled>
                        {user.displayName}
                    </NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item onClick={handleSignOut}>
                        Sign Out
                    </NavDropdown.Item>
                </>
            ) : (
                <NavDropdown.Item onClick={handleSignIn}>
                    Sign In with Google
                </NavDropdown.Item>
            )}
        </NavDropdown>)

}