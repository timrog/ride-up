import admin from 'firebase-admin'
import makeFetchCookie from 'fetch-cookie'
import * as logger from "firebase-functions/logger"
import { parse } from 'csv-parse/sync'

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
    const cookieValue = cookieDocSnapshot.get('value')

    if (cookieValue) {
        await fetchCookie.cookieJar.setCookie(cookieValue, "https://membermojo.co.uk", { ignoreError: false })
        logger.log("Retrieved cookie value", cookieValue)
        logger.log("New cookies",
            await fetchCookie.cookieJar.getCookieString("https://membermojo.co.uk"))
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

    let upstream: Response
    let upstreamBody: string
    if (validationLink) {
        upstream = await fetchCookie("https://membermojo.co.uk/vcgh/signin_password", {
            body: "",
            method: "POST"
        })
        upstreamBody = await upstream.text()
        const csrf = extractToken(upstreamBody)
        if (!csrf) {
            logger.error("CSRF response body", validationLink, upstreamBody)
            throw new Error("CSRF token not found")
        }

        upstream = await validateCsrfToken(validationLink, csrf)
        upstreamBody = await upstream.text()
        logger.log("validate response", upstream.url, upstream.status)
    }
    else {
        upstream = await fetchCookie("https://membermojo.co.uk/vcgh/membership/download_members")
        upstreamBody = await upstream.text()
        logger.log("download response received", upstream.status, upstream.url)

        if (!upstream.headers.get('Content-Type')?.startsWith("text/csv")) {
            upstream = await fetchCookie("https://membermojo.co.uk/vcgh/signin_password", {
                body: `email=${encodeURIComponent(mm_email)}&password=${encodeURIComponent(mm_password)}`,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                method: "POST"
            })
            upstreamBody = await upstream.text()
            logger.log("login response", upstream.status, upstream.url)
        }
    }

    const cookieString = await fetchCookie.cookieJar.getCookieString("https://membermojo.co.uk")
    await cookieDoc.set({ value: cookieString })

    if (upstream.url.includes("signin_verification_sent")) {
        logger.warn("Verification email sent")
        return undefined
    }
    else if (upstream.url.includes("download_members")) {
        return upstreamBody
    }
    else {
        throw new Error("Unexpected response received from " + upstream.url)
    }
}

export async function retrieveMembers(validationLink: string | undefined, mm_email: string, mm_password: string) {
    const csvString = await getMembersCsv(validationLink, mm_email, mm_password)
    if (!csvString) return []

    const records = parse(csvString, { delimiter: ",", columns: true }) as MemberEntry[]

    logger.info(`Converted ${records.length} records`)
    return records
}

export type MemberEntry = {
    Email: string
} & Record<string, string>