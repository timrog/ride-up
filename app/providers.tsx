// app/providers.tsx
'use client'

import { HeroUIProvider } from '@heroui/react'
import { ToastProvider } from '@heroui/toast'
import { I18nProvider } from "@react-aria/i18n"
import { ForegroundMessaging } from "./ForegroundMessaging"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <HeroUIProvider>
            <ToastProvider />
            <ForegroundMessaging />

            <I18nProvider locale="en-GB">
                {children}
            </I18nProvider>
        </HeroUIProvider>
    )
}
