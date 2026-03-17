#!/usr/bin/env node

import admin from 'firebase-admin'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const uid = process.argv[2]
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const serviceAccountPath = path.resolve(
    process.cwd(),
    process.env.SERVICE_ACCOUNT_KEY_PATH || 'service-account-key.json',
)

if (!uid) {
    console.error('Usage: node scripts/generate-debug-login-link.mjs <firebase-uid>')
    process.exit(1)
}

if (!projectId) {
    console.error('Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env')
    process.exit(1)
}

if (!fs.existsSync(serviceAccountPath)) {
    console.error(`Service account key file not found at ${serviceAccountPath}`)
    process.exit(1)
}

const serviceAccountKey = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

if (!serviceAccountKey.client_email || !serviceAccountKey.private_key) {
    console.error(`Invalid service account key file at ${serviceAccountPath}`)
    process.exit(1)
}

if (serviceAccountKey.project_id && serviceAccountKey.project_id !== projectId) {
    console.error(
        `Project mismatch: .env has ${projectId}, key file has ${serviceAccountKey.project_id}`,
    )
    process.exit(1)
}

if (!admin.apps.length) {
    admin.initializeApp({
        projectId,
        credential: admin.credential.cert({
            projectId,
            clientEmail: serviceAccountKey.client_email,
            privateKey: serviceAccountKey.private_key,
        }),
    })
}

const auth = admin.auth()

try {
    const user = await auth.getUser(uid)

    if (!user.email) {
        console.error(`User ${uid} does not have an email address in Firebase Auth.`)
        process.exit(1)
    }

    const link = await auth.generateSignInWithEmailLink(user.email, {
        url: `https://calendar.vcgh.co.uk/user?debugEmail=${encodeURIComponent(user.email)}`,
        handleCodeInApp: true,
    })

    console.log(link)
} catch (error) {
    console.error('Failed to generate login link:', error)
    process.exit(1)
}
