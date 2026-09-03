import * as logger from "firebase-functions/logger"
import { onMessagePublished } from "firebase-functions/v2/pubsub"
import { MemberPhotoMessage } from "./shared"
import admin from "firebase-admin"
import makeFetchCookie from 'fetch-cookie'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const region = 'europe-west2'

export const ProcessMemberPhoto = onMessagePublished({
    topic: "member-photos",
    region,
    maxInstances: 1,
    concurrency: 1,
    memory: '512MiB',
    minInstances: 0,
    retry: true
}, async (event) => {
    const { photoUrl, email, uid, cookies } = event.data.message.json as MemberPhotoMessage
    const fetchCookie = makeFetchCookie(fetch)

    try {
        for (let c of cookies) {
            await fetchCookie.cookieJar.setCookie(c, "https://membermojo.co.uk", { ignoreError: false })
        }

        const response = await fetchCookie(photoUrl)

        if (!response.ok) {
            logger.warn(`Failed to download photo for ${email}: ${response.status}`)
            return
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg'
        const bucket = admin.storage().bucket()
        const fileName = `member-photos/${uid}`
        const file = bucket.file(fileName)

        if (!response.body) {
            throw new Error(`Photo response for ${email} had no body`)
        }

        await pipeline(Readable.fromWeb(response.body as unknown as import('node:stream/web').ReadableStream<Uint8Array>), file.createWriteStream({
            metadata: {
                contentType,
                metadata: {
                    email,
                    uploadedAt: new Date().toISOString()
                }
            },
            predefinedAcl: 'publicRead',
            resumable: false
        }))

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`
        logger.info(`Uploaded photo for ${email} to ${publicUrl}`)

        await admin.auth().updateUser(uid, {
            photoURL: publicUrl
        })
    } catch (error) {
        logger.error(`Error processing photo for ${email}:`, error)
        throw error // Will retry
    }
})
