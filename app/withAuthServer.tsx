'use server'
import React, { ReactNode } from 'react'
import { getUser } from "./serverAuth"
import { MemberRole } from "./types"

interface WithAuthProps {
    role: MemberRole
    resourceOwner?: string
    children: ReactNode
}

const WithAuth: React.FC<WithAuthProps> = async ({ role, resourceOwner, children }) => {
    const { roles, currentUser } = await getUser()
    return (roles.includes(role)
        && (!resourceOwner || currentUser?.uid === resourceOwner))
        || roles.includes('admin')
        ? <>{children}</> : null
}

export default WithAuth