'use server'
import React, { ReactNode } from 'react'
import { getUser } from "./serverAuth"
import { MemberRole } from "./types"

interface WithAuthProps {
    role?: MemberRole
    resourceOwner?: string
    except?: boolean
    none?: boolean
    children: ReactNode
}

const WithAuth: React.FC<WithAuthProps> = async ({ role, resourceOwner, except = false, none = false, children }) => {
    const { roles, currentUser } = await getUser()
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


/*
    withAuth -> (role, resourceOwner, except, none, children) ->
        getUser() *-> (roles, currentUser)
        (role, currentUser) -> 
            (Some r, Some currentUser) ->


*/