import admin from "firebase-admin"
import * as logger from "firebase-functions/logger"
import { onMessagePublished } from "firebase-functions/v2/pubsub"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { google, sheets_v4 } from "googleapis"
import { appSecretsParam } from "./index"
import { getAppSecrets } from "./secrets"
import { decodeMembersCsv } from "./shared"
import {
    getAgeRangeFromDob,
    getOutwardPostcode,
    normalizeGender,
    normalizeLeader
} from "./memberDemographics"

const region = "europe-west2"
const membershipTab = "Membership"
const ridesTab = "Rides"
const signupsTab = "Signups"

type MemberRecord = ReturnType<typeof decodeMembersCsv>[number]

type MemberDemographics = {
    membershipType: string
    gender: string
    ageRange: string
}

type AuthUserClaims = {
    membership?: string
    demographics?: {
        gender?: string
        ageRange?: string
    }
}

const membershipHeaders = [
    "Export date",
    "Membership type",
    "Gender",
    "Age range",
    "First half of postcode",
    "Leader"
]

const rideHeaders = [
    "Activity date",
    "Activity id",
    "Title",
    "Date",
    "Duration",
    "Location",
    "Route link",
    "Created at",
    "Created by",
    "Created by name",
    "Link id",
    "Tags",
    "Is cancelled"
]

const signupHeaders = [
    "Activity id",
    "Created at",
    "User id",
    "Membership type",
    "Gender",
    "Age range"
]

function getExportDateIso(nowDate: Date = new Date()): string {
    return nowDate.toISOString().slice(0, 10)
}

function getMonthKey(dateString: string): string {
    return dateString.slice(0, 7)
}

function asTimestamp(value: unknown): admin.firestore.Timestamp | null {
    if (value instanceof admin.firestore.Timestamp) return value
    if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value)
    if (typeof value === "string") {
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) {
            return admin.firestore.Timestamp.fromDate(parsed)
        }
    }
    return null
}

function toIsoString(value: unknown): string {
    const ts = asTimestamp(value)
    return ts ? ts.toDate().toISOString() : ""
}

function asString(value: unknown): string {
    if (typeof value === "string") return value
    if (typeof value === "number") return `${value}`
    if (typeof value === "boolean") return value ? "true" : "false"
    return ""
}

async function createSheetsClient(): Promise<sheets_v4.Sheets> {
    const auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    })
    return google.sheets({ version: "v4", auth })
}

async function getRows(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    range: string
): Promise<string[][]> {
    const result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range
    })

    return (result.data.values || []).map((row) => row.map((value) => `${value}`))
}

async function ensureHeaders(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    tabName: string,
    headers: string[]
): Promise<void> {
    const existing = await getRows(sheets, spreadsheetId, `'${tabName}'!A1:Z1`)
    if (existing.length > 0) return

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${tabName}'!A1`,
        valueInputOption: "RAW",
        requestBody: { values: [headers] }
    })
}

async function appendRows(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    tabName: string,
    rows: string[][]
): Promise<void> {
    if (rows.length === 0) return

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${tabName}'!A1`,
        valueInputOption: "RAW",
        requestBody: { values: rows }
    })
}

function shouldSkipMembershipExport(existingRows: string[][], exportDate: string): boolean {
    const monthKey = getMonthKey(exportDate)
    return existingRows
        .slice(1)
        .some((row) => getMonthKey(row[0] || "") === monthKey)
}

function createMembershipRows(records: MemberRecord[], exportDate: string): string[][] {
    return records
        .filter((record) => !!record.Email)
        .map((record) => [
            exportDate,
            asString(record.Membership) || "Unknown",
            normalizeGender(record.Gender),
            getAgeRangeFromDob(record["Date of birth"]),
            getOutwardPostcode(record.Postcode),
            normalizeLeader(record["Ride Leader"])
        ])
}

function getLatestTimestamp(rows: string[][], columnIndex: number): admin.firestore.Timestamp | null {
    let latest: admin.firestore.Timestamp | null = null
    rows.slice(1).forEach((row) => {
        const ts = asTimestamp(row[columnIndex])
        if (!ts) return
        if (!latest || ts.toMillis() > latest.toMillis()) {
            latest = ts
        }
    })
    return latest
}

type EventDocument = {
    title?: unknown
    date?: unknown
    duration?: unknown
    location?: unknown
    routeLink?: unknown
    createdAt?: unknown
    createdBy?: unknown
    createdByName?: unknown
    linkId?: unknown
    tags?: unknown
    isCancelled?: unknown
}

function toRideRow(id: string, eventData: EventDocument): string[] {
    const tags = Array.isArray(eventData.tags)
        ? eventData.tags.map((tag) => asString(tag)).filter((tag) => !!tag).join("|")
        : ""

    return [
        toIsoString(eventData.date),
        id,
        asString(eventData.title),
        toIsoString(eventData.date),
        asString(eventData.duration),
        asString(eventData.location),
        asString(eventData.routeLink),
        toIsoString(eventData.createdAt),
        asString(eventData.createdBy),
        asString(eventData.createdByName),
        asString(eventData.linkId),
        tags,
        asString(eventData.isCancelled)
    ]
}

async function exportRides(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string
): Promise<number> {
    await ensureHeaders(sheets, spreadsheetId, ridesTab, rideHeaders)
    const existingRows = await getRows(sheets, spreadsheetId, `'${ridesTab}'!A:M`)
    const latestCreatedAt = getLatestTimestamp(existingRows, 7)

    let query: FirebaseFirestore.Query = admin.firestore()
        .collection("events")
        .orderBy("createdAt")

    if (latestCreatedAt) {
        query = query.where("createdAt", ">", latestCreatedAt)
    }

    const snapshot = await query.get()
    const rows = snapshot.docs
        .map((doc) => toRideRow(doc.id, doc.data() as EventDocument))
        .filter((row) => row[7])

    await appendRows(sheets, spreadsheetId, ridesTab, rows)
    return rows.length
}

type SignupRecord = {
    createdAt?: unknown
    userId?: unknown
    membership?: unknown
}

async function loadMemberDemographics(): Promise<Map<string, MemberDemographics>> {
    const map = new Map<string, MemberDemographics>()

    const auth = admin.auth()
    let nextPageToken: string | undefined
    do {
        const page = await auth.listUsers(1000, nextPageToken)
        page.users.forEach((user) => {
            const claims = (user.customClaims || {}) as AuthUserClaims
            map.set(user.uid, {
                membershipType: asString(claims.membership) || "Unknown",
                gender: asString(claims.demographics?.gender) || "Unknown",
                ageRange: asString(claims.demographics?.ageRange) || "Unknown"
            })
        })
        nextPageToken = page.pageToken
    } while (nextPageToken)

    return map
}

function toSignupRows(
    eventId: string,
    signups: Record<string, SignupRecord>,
    latestCreatedAt: admin.firestore.Timestamp | null,
    demographicsByUid: Map<string, MemberDemographics>
): string[][] {
    const rows: string[][] = []

    Object.values(signups).forEach((signup) => {
        const createdAt = asTimestamp(signup.createdAt)
        if (!createdAt) return
        if (latestCreatedAt && createdAt.toMillis() <= latestCreatedAt.toMillis()) return

        const userId = asString(signup.userId)
        if (!userId) return

        const demographics = demographicsByUid.get(userId)
        rows.push([
            eventId,
            createdAt.toDate().toISOString(),
            userId,
            demographics?.membershipType || asString(signup.membership) || "Unknown",
            demographics?.gender || "Unknown",
            demographics?.ageRange || "Unknown"
        ])
    })

    return rows
}

async function exportSignups(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string
): Promise<number> {
    await ensureHeaders(sheets, spreadsheetId, signupsTab, signupHeaders)
    const existingRows = await getRows(sheets, spreadsheetId, `'${signupsTab}'!A:F`)
    const latestCreatedAt = getLatestTimestamp(existingRows, 1)
    const demographicsByUid = await loadMemberDemographics()

    const snapshot = await admin.firestore().collectionGroup("activity").get()
    const rows: string[][] = []

    snapshot.docs.forEach((doc) => {
        if (doc.id !== "private") return
        const eventId = doc.ref.parent.parent?.id
        if (!eventId) return

        const data = doc.data() as { signups?: unknown }
        if (!data.signups || typeof data.signups !== "object") return

        const signupRows = toSignupRows(
            eventId,
            data.signups as Record<string, SignupRecord>,
            latestCreatedAt,
            demographicsByUid
        )
        rows.push(...signupRows)
    })

    rows.sort((a, b) => new Date(a[1]).getTime() - new Date(b[1]).getTime())
    await appendRows(sheets, spreadsheetId, signupsTab, rows)
    return rows.length
}

export const ExportMembershipToSheets = onMessagePublished({
    topic: "all-members",
    region,
    secrets: [appSecretsParam]
}, async (event) => {
    const secrets = getAppSecrets()
    const records = decodeMembersCsv(event)
    const sheets = await createSheetsClient()
    const exportDate = getExportDateIso()

    await ensureHeaders(sheets, secrets.google.sheetId, membershipTab, membershipHeaders)
    const existingRows = await getRows(sheets, secrets.google.sheetId, `'${membershipTab}'!A:F`)

    if (shouldSkipMembershipExport(existingRows, exportDate)) {
        logger.info(`Membership export skipped for ${getMonthKey(exportDate)}; rows already exist`)
        return
    }

    const rows = createMembershipRows(records, exportDate)
    await appendRows(sheets, secrets.google.sheetId, membershipTab, rows)
    logger.info(`Membership export appended ${rows.length} rows for ${exportDate}`)
})

export const ScheduleActivityExports = onSchedule({
    schedule: "15 5 * * *",
    timeZone: "Europe/London",
    region,
    retryCount: 5,
    secrets: [appSecretsParam]
}, async () => {
    const secrets = getAppSecrets()
    const sheets = await createSheetsClient()

    const ridesExported = await exportRides(sheets, secrets.google.sheetId)
    const signupsExported = await exportSignups(sheets, secrets.google.sheetId)

    logger.info(`Activity export complete. Rides: ${ridesExported}, Signups: ${signupsExported}`)
})