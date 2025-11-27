import * as logger from "firebase-functions/logger"
import { onMessagePublished } from "firebase-functions/v2/pubsub"
import { MemberPhotoMessage } from "./shared"
import admin from "firebase-admin"
import makeFetchCookie from 'fetch-cookie'

const region = 'europe-west2'
const fetchCookie = makeFetchCookie(fetch)

export const ProcessMemberPhoto = onMessagePublished({
    topic: "member-photos",
    region,
    maxInstances: 1,
    minInstances: 0
}, async (event) => {
    const { photoUrl, email, uid, cookies } = event.data.message.json as MemberPhotoMessage

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
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const bucket = admin.storage().bucket()
        const fileName = `member-photos/${uid}`
        const file = bucket.file(fileName)

        await file.save(buffer, {
            metadata: {
                contentType,
                metadata: {
                    email,
                    uploadedAt: new Date().toISOString()
                }
            },
            public: true
        })

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
