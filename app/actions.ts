'use server'
import { db } from "@/lib/firebase/initFirebase"
import { doc, getDoc } from "firebase/firestore"
import { getAuthenticatedAppForUser } from '@/lib/firebase/serverApp'

export async function getUserRole() {
    const { auth, currentUser } = await getAuthenticatedAppForUser()

    if (!currentUser || !currentUser.emailVerified) return "guest"
    const member = await getDoc(doc(db, 'members', currentUser.email.toLowerCase()))
    if (!member.exists()) return "guest"
    return member.data().rideLeader ? "leader" : "member"
}