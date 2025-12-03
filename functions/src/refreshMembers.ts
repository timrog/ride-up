import admin from 'firebase-admin'
import makeFetchCookie from 'fetch-cookie'
import * as logger from "firebase-functions/logger"
import { PubSub } from '@google-cloud/pubsub'
import { onMessagePublished } from "firebase-functions/v2/pubsub"
import { defineSecret } from "firebase-functions/params"

const mm_email = defineSecret('MM_USERNAME')
const mm_password = defineSecret('MM_PASSWORD')
const secrets = [mm_email, mm_password]
const region = 'europe-west2'

const pubsub = new PubSub()
const allMembersTopic = pubsub.topic('all-members')

const getCookieDoc = () => admin.firestore().doc('functions/cookie')
const fetchCookie = makeFetchCookie(fetch)

function extractToken(text: string) {
    const match = text.match(/"csrf_token":"([^"]+)/)
    if (!match?.length) return null
    const csrf = match[1]
    return csrf
}

async function getMembersCsv(validationLink: string | undefined, mm_email: string, mm_password: string) {
    const cookieDoc = getCookieDoc()
    const cookieDocSnapshot = await cookieDoc.get()
    const cookieValues = cookieDocSnapshot.get('values') as string[]

    if (cookieValues) {
        for (let c of cookieValues)
            await fetchCookie.cookieJar.setCookie(c, "https://membermojo.co.uk", { ignoreError: false })
    }

    const response = validationLink ? await applyValidation(validationLink) : await signInAndDownload(mm_email, mm_password)

    const cookieString = await fetchCookie.cookieJar.getCookieString("https://membermojo.co.uk")
    await cookieDoc.set({ values: cookieString.split("; ") })

    if (response.url.includes("signin_verification_sent")) {
        logger.warn("Verification email sent")
        return undefined
    }
    else if (response.url.includes("download_members")) {
        return response.arrayBuffer()
    }
    else {
        throw new Error("Unexpected response received from " + response.url)
    }
}

async function applyValidation(validationLink: string) {
    let response = await fetchCookie("https://membermojo.co.uk/vcgh/signin_password", {
        body: "",
        method: "POST"
    })
    const responseBody = await response.text()
    const csrf = extractToken(responseBody)
    if (!csrf) {
        logger.error("CSRF response body", validationLink, responseBody)
        throw new Error("CSRF token not found")
    }

    response = await validateCsrfToken(validationLink, csrf)
    logger.log("validate response", response.url, response.status)
    return response
}

async function validateCsrfToken(url: string, csrf: string) {
    const response = await fetchCookie(url, {
        method: "POST",
        body: `csrf_token=${encodeURIComponent(csrf)}`,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    })

    logger.log("validate response body", url, response.status, response.url)
    return response
}

async function signInAndDownload(mm_email: string, mm_password: string) {
    let response = await fetchCookie("https://membermojo.co.uk/vcgh/membership/download_members")
    logger.log("download response received", response.status, response.url)

    if (!response.headers.get('Content-Type')?.startsWith("text/csv")) {
        response = await fetchCookie("https://membermojo.co.uk/vcgh/signin_password", {
            body: `email=${encodeURIComponent(mm_email)}&password=${encodeURIComponent(mm_password)}`,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            method: "POST"
        })
        logger.log("login response", response.status, response.url)
    }
    return response
}

export async function retrieveMembers(validationLink?: string) {
    const csvBuffer = await getMembersCsv(validationLink, mm_email.value(), mm_password.value())
    if (!csvBuffer) return

    await allMembersTopic.publishMessage({
        data: Buffer.from(csvBuffer)
    })

    logger.info(`Published CSV of ${csvBuffer.byteLength} bytes to MemberCsv topic`)
}

export const RefreshMembers = onMessagePublished({
    topic: "refresh-members",
    secrets, region,
    concurrency: 1,
    minInstances: 0,
    maxInstances: 1
}, async (event) => {
    const message = event.data.message.json
    logger.info("Received refresh members request", message)

    // Throttle: only run if last run was more than 5 minutes ago
    const throttleDoc = admin.firestore().doc('functions/refresh-throttle')
    const now = Date.now()
    const throttleSnap = await throttleDoc.get()
    const lastRun = throttleSnap.get('lastRun') as number | undefined

    if (lastRun && (now - lastRun) < 5 * 60 * 1000) {
        const waitTime = Math.ceil((5 * 60 * 1000 - (now - lastRun)) / 1000)
        logger.warn(`Throttled: Last run was ${Math.ceil((now - lastRun) / 1000)}s ago. Wait ${waitTime}s more.`)
        return
    }

    await throttleDoc.set({ lastRun: now })
    return retrieveMembers(message.validationLink)
})

export type MemberEntry = {
    Email: string,
    'First name': string
    'Last name': string
    'Ride Leader': string
    'Membership': string
    'Photo'?: string
    'Members directory'?: string
    'Mobile number'?: string
    'Site role'?: string
} & Record<string, string>