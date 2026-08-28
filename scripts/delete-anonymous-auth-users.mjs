#!/usr/bin/env node

import admin from 'firebase-admin'
import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const shouldConfirmDelete = process.argv.includes('--confirm')
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const serviceAccountPath = path.resolve(
    process.cwd(),
    process.env.SERVICE_ACCOUNT_KEY_PATH || 'service-account-key.json',
)

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

function isAnonymousUser(user) {
    return user.providerData.length === 0 && !user.email && !user.phoneNumber
}

async function main() {
    let nextPageToken
    let scanned = 0
    let anonymousFound = 0
    let deleted = 0
    let deleteErrors = 0

    do {
        const page = await auth.listUsers(1000, nextPageToken)
        scanned += page.users.length

        const anonymousUsers = page.users.filter(isAnonymousUser)
        anonymousFound += anonymousUsers.length

        if (shouldConfirmDelete && anonymousUsers.length > 0) {
            const deleteResult = await auth.deleteUsers(anonymousUsers.map((user) => user.uid))
            deleted += deleteResult.successCount
            deleteErrors += deleteResult.failureCount
        }

        nextPageToken = page.pageToken
    } while (nextPageToken)

    const modeLabel = shouldConfirmDelete ? 'DELETE MODE' : 'DRY RUN'
    console.log(
        `[${modeLabel}] scanned=${scanned} anonymousFound=${anonymousFound} deleted=${deleted} deleteErrors=${deleteErrors}`,
    )

    if (!shouldConfirmDelete) {
        console.log('No users were deleted. Re-run with --confirm to delete anonymous users.')
    }
}

main().catch((error) => {
    console.error('Failed to process Firebase Auth users:', error)
    process.exit(1)
})