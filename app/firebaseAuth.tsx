'use client'
import { useEffect } from 'react'
import { setCookie, deleteCookie } from "cookies-next"
import {
    signInWithGoogle,
    signOut,
    onIdTokenChanged,
} from "@/lib/firebase/auth"
import { User } from "firebase/auth"
import { Avatar, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react"

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
        <Dropdown placement="bottom-end">
            <DropdownTrigger>
                <Avatar
                    isBordered
                    as="button"
                    className="transition-transform"
                    color="secondary"
                    name={user?.displayName}
                    size="sm"
                    src={user?.photoURL}
                />
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile Actions" variant="flat">
                {!user && <DropdownItem key="login" onPress={handleSignIn}>Sign in</DropdownItem>}
                {user && <DropdownItem key="logout" color="danger" onPress={handleSignOut}>Sign out</DropdownItem>}
            </DropdownMenu>
        </Dropdown>)

}