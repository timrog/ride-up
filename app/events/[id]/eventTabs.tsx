'use client'

import { ReactNode, useState } from "react"
import Activity from "./activity"
import RouteEmbed from "./routeEmbed"
import WithAuth from "app/withAuthClient"
import { Alert, Button, Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, Link } from "@heroui/react"
import { ChatBubbleLeftIcon, MapIcon, PencilIcon } from "@heroicons/react/24/outline"
import { IconInline } from "@/components/IconLine"

interface EventTabsProps {
    id: string
    details: ReactNode
    routeLink?: string
    isActive: boolean
}

export default function EventTabs({ id, details, routeLink, isActive }: EventTabsProps) {
    const [activeTab, setActiveTab] = useState('details')

    const Signups = () => {
        const [helpOpen, setHelpOpen] = useState(false)
        return <>
            <WithAuth role="member">
                <Activity id={id} isActive={isActive} />
            </WithAuth>

            <WithAuth except role="member">
                <Alert color="warning" className="mt-4">
                    <p>You don't have an active membership. Please join or renew to sign up to this event.</p>
                    <Button color="secondary" onPress={() => setHelpOpen(true)}>Help</Button>
                </Alert>
            </WithAuth>

            <Drawer
                isOpen={helpOpen}
                onOpenChange={setHelpOpen}
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
                        <Button onPress={() => setHelpOpen(false)}>Yes</Button>
                        <Button color="secondary" onPress={() => setHelpOpen(false)}>No</Button>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>

            <WithAuth none>
                <Button as={Link} color="primary" href={`/user?returnUrl=/events/${id}`}>Sign in to sign up</Button>
            </WithAuth>
        </>
    }

    const Route = () => routeLink ? <RouteEmbed link={routeLink} /> : null


    const tabs = [
        { key: 'details', icon: PencilIcon, title: 'Details', content: details, bg: 'transparent' },
        ...(routeLink ? [{ key: 'route', icon: MapIcon, title: 'Route', content: <Route />, bg: 'stone-200' }] : []),
        { key: 'signups', icon: ChatBubbleLeftIcon, title: 'Sign Up', content: <Signups />, bg: 'gray-100' }
    ]

    return (
        <>
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
                <div className="flex">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 py-4 px-4 text-center border-b-2 transition-colors ${activeTab === tab.key
                                ? 'border-secondary text-secondary'
                                : 'border-transparent bg-gray-100 text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <IconInline icon={tab.icon}>{tab.title}</IconInline>
                        </button>
                    ))}
                </div>
            </div>

            <div className="pb-16 md:pb-0">
                {tabs.map(tab => (
                    <section key={tab.key}
                        className={`${activeTab !== tab.key ? 'hidden' : ''} 
                            md:block md:border-b border-gray-200 last:border-b-0
                             bg-${tab.bg}`}>
                        <div className="container mx-auto px-4 py-8">
                            {tab.content}
                        </div>
                    </section>
                ))}
            </div>
        </>
    )
}   