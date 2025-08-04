'use client'
import { useEffect } from 'react'
import { setCookie, deleteCookie } from "cookies-next"
import {
    signOut,
    onIdTokenChanged,
} from "@/lib/firebase/auth"
import { User } from "firebase/auth"
import { Avatar, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/react"

function useUserSession(initialUser: User) {
    useEffect(() => {
        return onIdTokenChanged(async (user) => {
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
    const handleSignOut = () => signOut()

    return (
        <Dropdown placement="bottom-end">
            <DropdownTrigger>
                <Avatar
                    isBordered
                    as="button"
                    className="transition-transform"
                    color="secondary"
                    name={user?.displayName || "User"}
                    size="sm"
                    src={user?.photoURL || undefined}
                />
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile Actions" variant="flat">
                {!user && <DropdownItem key="login" href="/user">Sign in</DropdownItem> || null}
                {user && <DropdownItem key="logout" color="danger" onPress={handleSignOut}>Sign out</DropdownItem>}
            </DropdownMenu>
        </Dropdown>)

}