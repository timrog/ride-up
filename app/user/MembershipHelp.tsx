'use client'

import { Alert, Button, Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, Link, Progress } from "@heroui/react"
import NextLink from "next/link"
import { useEffect, useState } from "react"
import { refreshMembership } from "app/refreshMembership"
import { getAuth } from "firebase/auth"
import { useRoles } from "app/clientAuth"

type MembershipHelpProps = {
    showInlineAlert?: boolean
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export default function MembershipHelp({
    showInlineAlert = true,
    open,
    onOpenChange
}: MembershipHelpProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [state, setState] = useState<'start' | 'refreshing' | 'failure' | 'trySignInAgain'>('start')
    const { roles, currentUser } = useRoles()
    const isOpen = open ?? internalOpen

    const setIsOpen = (nextOpen: boolean) => {
        if (onOpenChange) {
            onOpenChange(nextOpen)
            return
        }
        setInternalOpen(nextOpen)
    }

    function close() {
        setIsOpen(false)
        setState('start')
    }

    useEffect(() => {
        if (state === 'refreshing' && roles.includes('member')) {
            setIsOpen(false)
        }
    }, [roles, state])

    const handleRefresh = async () => {
        setState('refreshing')
        try {
            const result = await refreshMembership()
            if (!result.success) {
                setState('failure')
                return
            }

            const auth = getAuth()
            const user = auth.currentUser

            if (user) {
                const startTime = Date.now()
                const maxWaitTime = 15000

                while (Date.now() - startTime < maxWaitTime) {
                    await user.getIdTokenResult(true)
                    await new Promise(resolve => setTimeout(resolve, 5000))
                }

                setState('failure')
                return
            }

            await new Promise(resolve => setTimeout(resolve, 15000))
            setState('trySignInAgain')
        } catch (error) {
            setState('failure')
        }
    }

    if (roles.includes('member')) {
        return null
    }

    return (
        <>
            {showInlineAlert && (
                <Alert color="warning" className="mt-4">
                    <p>I can't find an active membership. You must join or renew to sign up to rides. Or sign out and sign in again with an email address linked to a valid membership.</p>
                    <p>Click Help for more options.</p>
                    <Button color="secondary" onPress={() => setIsOpen(true)}>Help</Button>
                </Alert>
            )}
            {!showInlineAlert && (
                <Button color="secondary" variant="flat" onPress={() => setIsOpen(true)}>Help</Button>
            )}

            <Drawer
                isOpen={isOpen}
                onOpenChange={setIsOpen}
                isDismissable
            >
                <DrawerContent>
                    <DrawerHeader>Help with sign in</DrawerHeader>
                    {state == 'start' && <>
                        <DrawerBody>
                            <p>We can't find a valid membership for you. Either you haven't joined, your membership has lapsed, or the email address you've signed in with is not the one registered with the club. In the latter case, please sign out and sign back in again with the correct address. </p>
                            {currentUser && (<p>You are signed in as <strong>{getAuth().currentUser?.email}</strong>.</p>)}
                            <p><Link as={Link} target="_blank" href="https://membermojo.co.uk/vcgh/yourmembership">Manage my membership</Link></p>
                            <p>If you've recently joined or renewed in the last few hours, we might not have caught up.</p>
                            <p>Have you joined or renewed in the last 24 hours?</p>
                        </DrawerBody>
                        <DrawerFooter>
                            <Button onPress={handleRefresh}>Yes</Button>
                            <Button color="secondary" onPress={close}>No</Button>
                        </DrawerFooter>
                    </>}
                    {state == 'refreshing' && <>
                        <DrawerBody>
                            <p>Retrieving your membership information...</p>
                            <Progress className="mt-4" isIndeterminate />
                        </DrawerBody>
                        <DrawerFooter>
                            <Button color="secondary" onPress={close}>Cancel</Button>
                        </DrawerFooter>
                    </>}
                    {state == 'trySignInAgain' && <>
                        <DrawerBody>
                            <p>Membership data has been refreshed. Please try signing in again now.</p>
                        </DrawerBody>
                        <DrawerFooter>
                            <Button color="secondary" onPress={close}>Close</Button>
                        </DrawerFooter>
                    </>}
                    {state == 'failure' && <>
                        <DrawerBody>
                            <p>We couldn't verify your membership. Please ensure you've joined or renewed your membership. If the problem persists, please <NextLink href="/about">contact us</NextLink>.</p>
                        </DrawerBody>
                        <DrawerFooter>
                            <Button color="secondary" onPress={close}>Close</Button>
                        </DrawerFooter>
                    </>}
                </DrawerContent>
            </Drawer>
        </>
    )
}
