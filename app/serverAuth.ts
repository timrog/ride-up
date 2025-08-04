'use server'
import { getAuthenticatedAppForUser } from '@/lib/firebase/serverApp'
import { MemberRole } from "./types"

export async function getUser() {
    const { currentUser } = await getAuthenticatedAppForUser()
    const idToken = await currentUser?.getIdTokenResult()
    return { roles: (idToken?.claims['roles'] || []) as MemberRole[], currentUser, idToken }
}
