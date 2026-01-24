// enforces that this code can only be called on the server
// https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment
import "server-only"

import { cookies } from "next/headers"
import { initializeServerApp, initializeApp } from "firebase/app"

import { getAuth, connectAuthEmulator } from "firebase/auth"
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

import { clientCredentials } from "./initFirebase"

import admin from 'firebase-admin'
import type { ServiceAccount } from 'firebase-admin/app'

interface IdTokenResult {
  claims: Record<string, unknown>
}

interface SessionUser {
  uid: string
  email?: string
  displayName?: string
  photoURL?: string
  getIdTokenResult: () => Promise<IdTokenResult>
}

// Returns an authenticated client SDK instance for use in Server Side Rendering
// and Static Site Generation
export async function getAuthenticatedAppForUser() {
  const sessionCookie = (await cookies()).get("__session")?.value

  const firebaseServerApp = initializeServerApp(
    initializeApp(clientCredentials),
    {}
  )

  const auth = getAuth(firebaseServerApp)
  const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true'
  if (useEmulator) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    } catch {
      // ignore if already connected
    }
  }

  const db = getFirestore(firebaseServerApp)
  if (useEmulator) {
    try {
      connectFirestoreEmulator(db, "localhost", 8080)
    } catch { }
  }

  let currentUser: SessionUser | null = null

  if (sessionCookie) {
    try {
      const adminAuth = getAdminApp().auth()
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)

      currentUser = {
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        displayName: decodedClaims.name,
        photoURL: decodedClaims.picture,
        getIdTokenResult: async () => ({ claims: decodedClaims })
      }
    } catch (error) {
      console.error('Session verification failed:', error)
    }
  }

  return { firebaseServerApp, auth, currentUser, db }
}

function initializeAdminApp() {
  if (!admin.apps.length) {
    const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === 'true'
    const isProduction = process.env.NODE_ENV === 'production'

    try {
      if (isProduction) {
        admin.initializeApp()
      } else if (useEmulator) {
        console.log('🔧 Initializing Firebase Admin for EMULATOR')
        process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
        process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080'

        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-project'
        admin.initializeApp({
          projectId: projectId
        })
        console.log('✅ Emulator Admin SDK initialized')
      } else {
        console.log('🚀 Initializing Firebase Admin for DEVELOPMENT')
        const serviceAccount = require('../../service-account-key.json')

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as ServiceAccount),
          projectId: serviceAccount.project_id
        })
        console.log('✅ Development Admin SDK initialized')
      }
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error)
      throw error
    }
  }
}

export function getAdminApp() {
  initializeAdminApp()
  // In production (App Hosting), Firebase automatically creates an app named "firebase-frameworks"
  // Return the first available app (either our initialized default or the auto-created one)
  return admin.apps[0] || admin.app()
}