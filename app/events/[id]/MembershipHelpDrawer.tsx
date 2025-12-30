'use client'

import { Button, Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, Link, Progress } from "@heroui/react"
import { useEffect, useState } from "react"
import { refreshMembership } from "app/refreshMembership"
import { getAuth } from "firebase/auth"
import { useRoles } from "app/clientAuth"

interface MembershipHelpDrawerProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
}

export default function MembershipHelpDrawer({ isOpen, onOpenChange }: MembershipHelpDrawerProps) {
    const [state, setState] = useState<'start' | 'refreshing' | 'failure'>('start')
    const { roles } = useRoles()

    useEffect(() => {
        if (state === 'refreshing' && roles.includes('member')) {
            onOpenChange(false)
        }
    }, [roles, state, onOpenChange])

    const handleRefresh = async () => {
        setState('refreshing')
        try {
            const result = await refreshMembership()
            if (result.success) {
                const auth = getAuth()
                const user = auth.currentUser

                if (user) {
                    const startTime = Date.now()
                    const maxWaitTime = 15000

                    while (Date.now() - startTime < maxWaitTime) {
                        await user.getIdTokenResult(true)
                        await new Promise(resolve => setTimeout(resolve, 5000))
                    }
                }

                setState('failure')
            }
        } catch (error) {
            setState('failure')
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
                {state == 'start' && <>
                    <DrawerBody>
                        <p>We can't find a valid membership for you. Either you haven't joined, your membership has lapsed, or the email address you've signed in with is not the one registered with the club. In the latter case, please sign out and sign back in again with the correct address. </p>
                        <p>You are signed in as <strong>{getAuth().currentUser?.email}</strong>.</p>
                        <p><Link as={Link} target="_blank" href="https://membermojo.co.uk/vcgh/yourmembership">Manage my membership</Link></p>
                        <p>If you've recently joined or renewed in the last few hours, we might not have caught up.</p>
                        <p>Have you joined or renewed in the last 24 hours?</p>
                    </DrawerBody>
                    <DrawerFooter>
                        <Button onPress={handleRefresh}>Yes</Button>
                        <Button color="secondary" onPress={() => onOpenChange(false)}>No</Button>
                    </DrawerFooter>
                </>}
                {state == 'refreshing' && <>
                    <DrawerBody>
                        <p>Retrieving your membership information...</p>
                        <Progress className="mt-4" isIndeterminate />
                    </DrawerBody>
                    <DrawerFooter>
                        <Button color="secondary" onPress={() => onOpenChange(false)}>Cancel</Button>
                    </DrawerFooter>
                </>}
                {state == 'failure' && <>
                    <DrawerBody>
                        <p>We couldn't verify your membership. Please ensure you've joined or renewed your membership. If the problem persists, please <a href="/about">contact us</a>.</p>
                    </DrawerBody>
                    <DrawerFooter>
                        <Button color="secondary" onPress={() => onOpenChange(false)}>Close</Button>
                    </DrawerFooter>
                </>}
            </DrawerContent>
        </Drawer>
    )
}
