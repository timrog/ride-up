import "server-only"
import admin from 'firebase-admin'

let app: admin.app.App | undefined

export function getAdminApp() {
    if (!app) {
        if (!admin.apps.length) {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
            if (privateKey && clientEmail && projectId) {
                admin.initializeApp({
                    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
                })
            } else {
                admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                    projectId: projectId ?? process.env.GCLOUD_PROJECT,
                })
            }
        }
        app = admin.app()
    }
    return app
}

export function getAdminDb() {
    return getAdminApp().firestore()
}

export const getAdminAuth = () => getAdminApp().auth()
