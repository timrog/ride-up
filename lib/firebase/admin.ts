import admin from 'firebase-admin'

let app: admin.app.App | undefined

export function getAdminApp() {
    if (!app) {
        if (!admin.apps.length) {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
            const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
            if (!privateKey || !clientEmail || !projectId) {
                throw new Error('Missing Firebase admin credentials env vars')
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
