import React from 'react'

interface IconLineProps {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
    size?: number
    className?: string
    children: React.ReactNode
}

export function IconLine({ icon, size = 18, children }: IconLineProps) {
    const Icon = icon
    return (
        <p className={`flex items-center gap-1`}>
            <Icon height={size} /> {children}
        </p>
    )
}

export function IconInline({ icon, size = 18, children }: IconLineProps) {
    const Icon = icon
    return (
        <span className={`inline-flex items-center gap-1`}>
            <Icon height={size} /> {children}
        </span>
    )
}
