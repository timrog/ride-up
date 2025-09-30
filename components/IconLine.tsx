import React from 'react'
import { MapPinIcon, PencilIcon, DocumentDuplicateIcon, XCircleIcon, StopIcon, XMarkIcon, MapIcon } from '@heroicons/react/24/outline'


interface IconLineProps {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    size?: number
    className?: string
    children: React.ReactNode
}

export default function IconLine({ icon, size = 18, children }: IconLineProps) {
    const Icon = icon
    return (
        <p className={`flex items-center gap-1`}>
            <Icon height={size} /> {children}
        </p>
    )
}
