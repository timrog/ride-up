import "server-only"
import admin from 'firebase-admin'
import { getAppSecrets } from '@/lib/secrets'

let app: admin.app.App | undefined

export function getAdminApp() {
    if (!app) {
        if (!admin.apps.length) {
            const secrets = getAppSecrets()
            const { privateKey, clientEmail } = secrets.firebase
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

            if (!projectId) {
                throw new Error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID env var')
            }

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            })  
        }
        app = admin.app()
    }
    return app
}

export function getAdminDb() {
    return getAdminApp().firestore()
}

export const getAdminAuth = () => getAdminApp().auth()
