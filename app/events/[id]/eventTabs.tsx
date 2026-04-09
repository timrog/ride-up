'use client'

import { ReactNode, useState, useEffect, useRef } from "react"
import Activity from "./activity"
import RouteEmbed from "./routeEmbed"
import WithAuth from "app/withAuthClient"
import { Button } from "@heroui/react"
import { ChatBubbleLeftIcon, MapIcon, PencilIcon } from "@heroicons/react/24/outline"
import { IconInline } from "@/components/IconLine"
import MembershipHelp from "../../user/MembershipHelp"
import Link from "next/link"

interface EventTabsProps {
    id: string
    details: ReactNode
    routeLink?: string
    isActive: boolean
}

export default function EventTabs({ id, details, routeLink, isActive }: EventTabsProps) {
    const [activeTab, setActiveTab] = useState('details')
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({})

    useEffect(() => {
        const onHashChange = () => {
            const hash = window.location.hash.slice(1)
            if (!hash) return
            setActiveTab(hash)
            const el = sectionRefs.current[hash]
            if (el && window.matchMedia('(min-width: 768px)').matches) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
        }

        window.addEventListener('hashchange', onHashChange)
        onHashChange()
        return () => window.removeEventListener('hashchange', onHashChange)
    }, [])

    const Signups = () => {
        return <>
            <WithAuth role="member">
                <Activity id={id} isActive={isActive} />
            </WithAuth>

            <WithAuth>
                <MembershipHelp />
            </WithAuth>

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
                        id={tab.key}
                        ref={el => { sectionRefs.current[tab.key] = el }}
                        className={`${activeTab !== tab.key ? 'hidden' : ''} 
                            md:block md:border-b border-gray-200 last:border-b-0
                             bg-${tab.bg}`}>
                        <div className="container mx-auto px-6 py-6">
                        {tab.content}
                        </div>                    </section>
                ))}
            </div>
        </>
    )
}   