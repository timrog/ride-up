// Modular Firebase v.9 Initialization.
import { initializeApp } from "firebase/app";
import {
    initializeFirestore,
    getFirestore,
    connectFirestoreEmulator,
    persistentLocalCache,
    persistentMultipleTabManager,
} from "firebase/firestore";
import { getDatabase } from "@firebase/database";

const clientCredentials = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

const app = initializeApp(clientCredentials);

const db =
    typeof window !== "undefined"
        ? initializeFirestore(app, {
              localCache: persistentLocalCache({
                  tabManager: persistentMultipleTabManager(),
              }),
          })
        : getFirestore(app);

// Connect to emulators when USE_EMULATOR is true
const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === "true";
if (useEmulator) {
    connectFirestoreEmulator(db, "localhost", 8080);
    console.log("🔧 Connected to Firestore emulator");
}

export { db, clientCredentials };