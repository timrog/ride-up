'use client'
import { signOut } from "@/lib/firebase/auth"
import { Avatar, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Spinner } from "@heroui/react"
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'

export default function FirebaseAuth() {
    const { user, loading } = useAuth()
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

    return (
        <Dropdown placement="bottom-end">
            <DropdownTrigger>
                <Avatar
                    as="button"
                    className="transition-transform"
                    color="secondary"
                    name={initials}
                    size="lg"
                    src={user?.photoURL || undefined}
                />
            </DropdownTrigger>
            <DropdownMenu aria-label="Profile Actions" variant="flat">
                {!user && <DropdownItem key="login" href={`/user?returnUrl=${encodeURIComponent(currentPath)}`}>Sign in</DropdownItem> || null}
                {user && <DropdownItem key="logout" color="danger" onPress={handleSignOut}>Sign out</DropdownItem>}
                <DropdownItem key="postRide" color="primary" href="/create">Post a ride</DropdownItem>
            </DropdownMenu>
        </Dropdown>)

}