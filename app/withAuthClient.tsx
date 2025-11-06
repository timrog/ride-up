'use client'
import React, { ReactNode } from 'react'
import { MemberRole } from "./types"
import { useRoles } from "./clientAuth"

interface WithAuthProps {
    role?: MemberRole
    resourceOwner?: string
    except?: boolean
    none?: boolean
    children: ReactNode
}

const WithAuth = ({ role, resourceOwner, except = false, none = false, children }: WithAuthProps) => {
    const { roles, currentUser } = useRoles()
    let isMatch = !!currentUser
    if (role && currentUser) {
        isMatch =
            (roles.includes(role)
                && (!resourceOwner || currentUser?.uid === resourceOwner))
            || roles.includes('admin')
        isMatch = isMatch !== except
    }
    if (none) isMatch = !currentUser
    return isMatch ? <>{children}</> : null
}


export default WithAuth