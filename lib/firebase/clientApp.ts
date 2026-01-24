"use client"

import { initializeApp } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getMessaging, isSupported } from "firebase/messaging"
import { clientCredentials } from "./initFirebase"

// Use automatic initialization
// https://firebase.google.com/docs/app-hosting/firebase-sdks#initialize-with-no-arguments
export const firebaseApp = initializeApp(clientCredentials)

export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
export const storage = getStorage(firebaseApp)

// Initialize messaging (only in browser context and when supported)
let messagingInstance: ReturnType<typeof getMessaging> | null = null
export const getMessagingInstance = async () => {
    if (typeof window === 'undefined') return null
    if (messagingInstance) return messagingInstance
    const supported = await isSupported()
    if (supported) {
        messagingInstance = getMessaging(firebaseApp)
        return messagingInstance
    }
    return null
}

// Connect to emulators when USE_EMULATOR is true
const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true'
if (useEmulator) {
    console.log('🔧 Using Firebase emulators (client)')
    try {
        connectFirestoreEmulator(db, 'localhost', 8080)
    } catch (e) {
        // ignore if already connected
    }
    try {
        // Auth emulator uses http (not https) and requires disableWarnings to avoid duplicate connection errors
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    } catch (e) {
        // ignore if already connected
    }
}