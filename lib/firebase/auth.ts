'use client'
import {
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged as _onAuthStateChanged,
    onIdTokenChanged as _onIdTokenChanged,
    NextOrObserver,
    User,
} from "firebase/auth"
import { deleteCookie } from "cookies-next/client"

import { auth } from "./clientApp"

export function onAuthStateChanged(cb: NextOrObserver<User>) {
    return _onAuthStateChanged(auth, cb)
}

export function onIdTokenChanged(cb: NextOrObserver<User>) {
    return _onIdTokenChanged(auth, cb)
}

export async function signInWithGoogle() {
    const provider = new GoogleAuthProvider()

    try {
        await signInWithPopup(auth, provider)
    } catch (error) {
        console.error("Error signing in with Google", error)
    }
}

export async function signOut() {
    try {
        deleteCookie("__session")
        await auth.signOut()

        debugger
        if (typeof indexedDB !== 'undefined') {
            indexedDB.deleteDatabase('firebaseLocalStorageDb')
        }
    } catch (error) {
        console.error("Error signing out", error)
        throw error
    }
}