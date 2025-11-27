'use client'

import { Button, Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, Link } from "@heroui/react"
import { useState } from "react"
import { refreshMembership } from "app/refreshMembership"

interface MembershipHelpDrawerProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export default function MembershipHelpDrawer({ isOpen, onOpenChange }: MembershipHelpDrawerProps) {
    const [isRefreshing, setIsRefreshing] = useState(false)

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            const result = await refreshMembership()
            if (result.success) {
                onOpenChange(false)
            }
        } finally {
            setIsRefreshing(false)
        }
    }

    return (
        <Drawer
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            isDismissable
        >
            <DrawerContent>
                <DrawerHeader>Help with sign in</DrawerHeader>
                <DrawerBody>
                    <p>We can't find a valid membership for you. Either you haven't joined, your membership has lapsed, or the email address you've signed in with is not the one registered with the club. In the latter case, please sign out and sign back in again with the correct address. </p>
                    <p><Link as={Link} target="_blank" href="https://membermojo.co.uk/vcgh/yourmembership">Manage my membership</Link></p>
                    <p>If you've recently joined or renewed in the last few hours, we might not have caught up.</p>
                    <p>Have you joined or renewed in the last 24 hours?</p>
                </DrawerBody>
                <DrawerFooter>
                    <Button onPress={handleRefresh} isLoading={isRefreshing}>Yes</Button>
                    <Button color="secondary" onPress={() => onOpenChange(false)}>No</Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
