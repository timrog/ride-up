'use client'
import React, { ReactNode } from 'react'
import { MemberRole } from "./types"
import { useRoles } from "./clientAuth"

const WithAuth = ({ role, resourceOwner, children }: {
    role: MemberRole
    resourceOwner?: string
    children: ReactNode
}) => {
    const { roles, currentUser } = useRoles()
    return roles.includes(role)
        && (!resourceOwner || currentUser?.uid === resourceOwner)
        ? <>{children}</> : null
}

export default WithAuth