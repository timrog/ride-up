'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from '@heroui/drawer'
import { IconLine } from "@/components/IconLine"
import { ChevronLeftIcon } from "@heroicons/react/24/outline"
import Link from "next/link"
import { Button } from "@heroui/react"

export default function DrawerPortal({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const isOpen = pathname !== '/'
    
    return (
        <Drawer
            isOpen={isOpen}
            onClose={() => router.push('/')}
            placement="right"
            size="5xl"
            hideCloseButton
        >
            <DrawerContent>
                <DrawerHeader>
                    <Button isIconOnly as={Link} href="/" variant="light" color="secondary" className="-ml-2"><ChevronLeftIcon height={36} /></Button>
                </DrawerHeader>
                <DrawerBody className="p-0">
                    {children}
                </DrawerBody>
            </DrawerContent>
        </Drawer>
    )
}
