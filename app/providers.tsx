// app/providers.tsx
'use client'

import { HeroUIProvider } from '@heroui/react'
import { ToastProvider } from '@heroui/toast'
import { I18nProvider } from "@react-aria/i18n"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <HeroUIProvider>
            <ToastProvider />
            <I18nProvider locale="en-GB">
                {children}
            </I18nProvider>
        </HeroUIProvider>
    )
}
