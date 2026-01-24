'use client'
import { signOut } from "@/lib/firebase/auth"
import { Avatar, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Spinner } from "@heroui/react"
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRoles } from "./clientAuth"

export default function FirebaseAuth() {
    const { user, loading } = useAuth()
    const { roles } = useRoles()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const initials = user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase()

    const handleSignOut = async () => {
        try {
            await signOut()
        } catch (error) {
            console.error('Failed to sign out:', error)
        }
    }

    const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')

    if (loading) {
        return (
            <Spinner size="sm" />
        )
    }

    return <>
        <Dropdown placement="bottom-end">
            <DropdownTrigger>
                <Avatar
                    as="button"
                    className="transition-transform"
                    color="secondary"
                    name={initials}
                    size="lg"
                    src={user?.photoURL || undefined}
                    isBordered={true}
                />
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile Actions" variant="flat">
                <DropdownItem key="list" href="/">Upcoming rides</DropdownItem>
                {!user && <DropdownItem key="login" href={`/user?returnUrl=${encodeURIComponent(currentPath)}`}>Sign in</DropdownItem> || null}
                {user && <DropdownItem key="user" href={`/user`}>Your profile</DropdownItem> || null}
                <DropdownItem key="postRide" color="primary" href="/create">Post a ride</DropdownItem>
                <DropdownItem key="help" href="/about">Help</DropdownItem>
                {user && <DropdownItem key="logout" color="danger" onPress={handleSignOut}>Sign out</DropdownItem>}
                {roles?.includes('admin') ?
                    <DropdownItem key="admin" color="primary" href="/admin">Admin diagnostics</DropdownItem> : null}
                {roles?.includes('admin') ?
                    <DropdownItem key="notifications" color="primary" href="/notifications">Notifications (beta)</DropdownItem> : null}
            </DropdownMenu>
        </Dropdown>
    </>
}