// app/providers.tsx
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { HeroUIProvider } from '@heroui/react'
import { ToastProvider } from '@heroui/toast'
import { I18nProvider } from "@react-aria/i18n"
import { DraftEventProvider } from "./create/editor"
import { ForegroundMessaging } from "./ForegroundMessaging"
import { useRouter } from "next/navigation"

type RefreshContextType = {
    refreshKey: number
    invalidate: () => void
}

const RefreshContext = createContext<RefreshContextType>({
    refreshKey: 0,
    invalidate: () => { }
})

export function useRefresh() {
    return useContext(RefreshContext)
}

export function Providers({ children }: { children: React.ReactNode }) {
    const [refreshKey, setRefreshKey] = useState(0)
    const invalidate = () => setRefreshKey(k => k + 1)
    const router = useRouter();

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        const onServiceWorkerMessage = (event: MessageEvent) => {
            const data = event.data as { type?: string; url?: string } | undefined
            if (!data || data.type !== 'notification-click' || !data.url) return

            const targetUrl = new URL(data.url, window.location.origin)
            if (targetUrl.origin !== window.location.origin) return

            router.push(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`)
        }

        navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage)
        return () => {
            navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage)
        }
    }, [router])

    return (
        <HeroUIProvider navigate={router.push}>
            <ToastProvider />
            <ForegroundMessaging />

            <I18nProvider locale="en-GB">
                <RefreshContext.Provider value={{ refreshKey, invalidate }}>
                    <DraftEventProvider>
                        {children}
                    </DraftEventProvider>
                </RefreshContext.Provider>
            </I18nProvider>
        </HeroUIProvider>
    )
}
