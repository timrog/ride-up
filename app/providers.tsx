// app/providers.tsx
'use client'

import React, { createContext, useContext, useState } from 'react'
import { HeroUIProvider } from '@heroui/react'
import { ToastProvider } from '@heroui/toast'
import { I18nProvider } from "@react-aria/i18n"
import { DraftEventProvider } from "./create/editor"
import { ForegroundMessaging } from "./ForegroundMessaging"
import { ref } from "firebase/storage"

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
    return (
        <HeroUIProvider>
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
