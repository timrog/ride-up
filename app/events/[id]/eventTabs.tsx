'use client'

import { ReactNode, useState } from "react"
import Activity from "./activity"
import RouteEmbed from "./routeEmbed"
import WithAuth from "app/withAuthClient"
import { Alert, Button, Link } from "@heroui/react"
import { ChatBubbleLeftIcon, MapIcon, PencilIcon } from "@heroicons/react/24/outline"
import { IconInline } from "@/components/IconLine"
import MembershipHelpDrawer from "./MembershipHelpDrawer"

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
                    <p>I can't find an active membership. Please join or renew to sign up to this event. Or sign out and sign in again with an email address linked to a valid membership.</p>
                    <Button color="secondary" onPress={() => setHelpOpen(true)}>Help</Button>
                </Alert>
            </WithAuth>

            <MembershipHelpDrawer isOpen={helpOpen} onOpenChange={setHelpOpen} />

            <WithAuth none>
                <Button as={Link} color="primary" href={`/user?returnUrl=/events/${id}`}>Sign in to sign up</Button>
            </WithAuth>
        </>
    }

    const Route = () => routeLink ? <RouteEmbed link={routeLink} /> : null


    const tabs = [
        { key: 'details', icon: PencilIcon, title: 'Details', content: details, bg: 'transparent' },
        ...(routeLink ? [{ key: 'route', icon: MapIcon, title: 'Route', content: <Route />, bg: 'stone-200' }] : []),
        { key: 'signups', icon: ChatBubbleLeftIcon, title: 'Sign-ups', content: <Signups />, bg: 'gray-100' }
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