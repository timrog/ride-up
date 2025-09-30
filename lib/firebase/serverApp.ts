// enforces that this code can only be called on the server
// https://nextjs.org/docs/app/building-your-application/rendering/composition-patterns#keeping-server-only-code-out-of-the-client-environment
import "server-only"

import { cookies } from "next/headers"
import { initializeServerApp, initializeApp } from "firebase/app"

import { getAuth, connectAuthEmulator } from "firebase/auth"
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

import { clientCredentials } from "./initFirebase"

// Returns an authenticated client SDK instance for use in Server Side Rendering
// and Static Site Generation
export async function getAuthenticatedAppForUser() {
  const authIdToken = (await cookies()).get("__session")?.value

  // Firebase Server App is a new feature in the JS SDK that allows you to
  // instantiate the SDK with credentials retrieved from the client & has
  // other affordances for use in server environments.
  const firebaseServerApp = initializeServerApp(
    // https://github.com/firebase/firebase-js-sdk/issues/8863#issuecomment-2751401913
    initializeApp(clientCredentials),
    {
      authIdToken,
    }
  )

  const auth = getAuth(firebaseServerApp)
  if (process.env.NODE_ENV === 'development') {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true })
    } catch (e) {
      // ignore if already connected
    }
  }
  await auth.authStateReady()
  const db = getFirestore(firebaseServerApp)
  if (process.env.NODE_ENV === "development") {
    try {
      connectFirestoreEmulator(db, "localhost", 8080)
    } catch { }
  }

  return { firebaseServerApp, auth, currentUser: auth.currentUser, db }
}
