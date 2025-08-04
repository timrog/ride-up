"use client"

import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { clientCredentials } from "./initFirebase"

// Use automatic initialization
// https://firebase.google.com/docs/app-hosting/firebase-sdks#initialize-with-no-arguments
export const firebaseApp = initializeApp(clientCredentials)

export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
export const storage = getStorage(firebaseApp)
// Connect to emulators in development mode
if (process.env.NODE_ENV === 'development') {
    console.log('Using Firebase emulators')
    connectFirestoreEmulator(db, 'localhost', 8080)
}