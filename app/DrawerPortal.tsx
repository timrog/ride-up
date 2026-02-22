'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@heroui/drawer'
import { IconLine } from "@/components/IconLine"
import { ChevronLeftIcon } from "@heroicons/react/24/outline"
import Link from "next/link"

export default function DrawerPortal({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const isOpen = pathname !== '/'
    
    return (
        <Drawer
            isOpen={isOpen}
            onClose={() => { console.log('[DrawerPortal] onClose fired, pathname:', pathname); router.push('/') }}
            placement="right"
            size="5xl"
        >
            <DrawerContent>
                <DrawerHeader>
        <Link href="/"><ChevronLeftIcon height={28} /></Link>
                </DrawerHeader>
                <DrawerBody>
                    {children}
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    )
}
