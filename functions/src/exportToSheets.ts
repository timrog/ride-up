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
const rideTagsTab = "Ride tags"
const signupsTab = "Signups"
const checkpointsTab = "Checkpoints"
const ridesLatestCreatedAtCheckpointKey = "ridesLatestCreatedAt"

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

const rideTagHeaders = [
    "Activity id",
    "Tag"
]

const checkpointHeaders = [
    "Key",
    "Value"
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

async function getRangeRows(
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

async function ensureTabExists(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    tabName: string
): Promise<void> {
    const metadata = await sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false,
        fields: "sheets(properties(title))"
    })

    const exists = (metadata.data.sheets || [])
        .some((entry) => entry.properties?.title === tabName)
    if (exists) return

    try {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        addSheet: {
                            properties: {
                                title: tabName
                            }
                        }
                    }
                ]
            }
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!message.includes("already exists")) {
            throw error
        }
    }
}

async function getSheetRowCount(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    tabName: string
): Promise<number> {
    await ensureTabExists(sheets, spreadsheetId, tabName)

    const result = await sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false,
        fields: "sheets(properties(title,gridProperties(rowCount)))"
    })

    const sheet = result.data.sheets?.find((entry) => entry.properties?.title === tabName)
    return sheet?.properties?.gridProperties?.rowCount || 0
}

async function rowHasData(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    tabName: string,
    lastColumn: string,
    rowNumber: number
): Promise<boolean> {
    const row = await getRangeRows(
        sheets,
        spreadsheetId,
        `'${tabName}'!A${rowNumber}:${lastColumn}${rowNumber}`
    )
    const values = row[0] || []
    return values.some((value) => value.trim() !== "")
}

async function getLastDataRowNumber(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    tabName: string,
    lastColumn: string
): Promise<number> {
    const maxRow = await getSheetRowCount(sheets, spreadsheetId, tabName)
    if (maxRow === 0) return 0

    let low = 1
    let high = maxRow
    let lastDataRow = 0

    while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        if (await rowHasData(sheets, spreadsheetId, tabName, lastColumn, mid)) {
            lastDataRow = mid
            low = mid + 1
        } else {
            high = mid - 1
        }
    }

    return lastDataRow
}

async function getLastRowValues(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    tabName: string,
    lastColumn: string
): Promise<string[] | null> {
    const lastDataRow = await getLastDataRowNumber(sheets, spreadsheetId, tabName, lastColumn)
    if (lastDataRow <= 1) return null

    const rows = await getRangeRows(
        sheets,
        spreadsheetId,
        `'${tabName}'!A${lastDataRow}:${lastColumn}${lastDataRow}`
    )
    return rows[0] || null
}

async function getLatestTimestampFromLastRow(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    tabName: string,
    lastColumn: string,
    timestampColumnIndex: number
): Promise<admin.firestore.Timestamp | null> {
    const lastRow = await getLastRowValues(sheets, spreadsheetId, tabName, lastColumn)
    if (!lastRow) return null
    return asTimestamp(lastRow[timestampColumnIndex])
}

async function getRidesLatestCreatedAtCheckpoint(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string
): Promise<admin.firestore.Timestamp | null> {
    await ensureHeaders(sheets, spreadsheetId, checkpointsTab, checkpointHeaders)
    const rows = await getRangeRows(sheets, spreadsheetId, `'${checkpointsTab}'!A:B`)

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || []
        if ((row[0] || "") !== ridesLatestCreatedAtCheckpointKey) continue
        return asTimestamp(row[1])
    }

    return null
}

async function setRidesLatestCreatedAtCheckpoint(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    latestCreatedAt: admin.firestore.Timestamp
): Promise<void> {
    await ensureHeaders(sheets, spreadsheetId, checkpointsTab, checkpointHeaders)
    const rows = await getRangeRows(sheets, spreadsheetId, `'${checkpointsTab}'!A:B`)
    const value = latestCreatedAt.toDate().toISOString()

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i] || []
        if ((row[0] || "") !== ridesLatestCreatedAtCheckpointKey) continue

        const rowNumber = i + 1
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${checkpointsTab}'!B${rowNumber}`,
            valueInputOption: "RAW",
            requestBody: { values: [[value]] }
        })
        return
    }

    await appendRows(sheets, spreadsheetId, checkpointsTab, [[ridesLatestCreatedAtCheckpointKey, value]])
}

async function ensureHeaders(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    tabName: string,
    headers: string[]
): Promise<void> {
    await ensureTabExists(sheets, spreadsheetId, tabName)

    const existing = await getRangeRows(sheets, spreadsheetId, `'${tabName}'!A1:Z1`)
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

function shouldSkipMembershipExportFromLastRow(lastRow: string[] | null, exportDate: string): boolean {
    if (!lastRow) return false
    const lastExportDate = lastRow[0] || ""
    if (!lastExportDate) return false
    return getMonthKey(lastExportDate) === getMonthKey(exportDate)
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
        ? eventData.tags.map((tag) => asString(tag)).filter((tag) => !!tag).join(",")
        : ""

    return [
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
    spreadsheetId: string,
    latestCreatedAt: admin.firestore.Timestamp | null
): Promise<{ count: number; latestExportedCreatedAt: admin.firestore.Timestamp | null }> {
    await ensureHeaders(sheets, spreadsheetId, ridesTab, rideHeaders)

    let query: FirebaseFirestore.Query = admin.firestore()
        .collection("events")
        .orderBy("createdAt")

    if (latestCreatedAt) {
        query = query.where("createdAt", ">", latestCreatedAt)
    }

    const snapshot = await query.get()
    let latestExportedCreatedAt: admin.firestore.Timestamp | null = null
    const rows = snapshot.docs
        .map((doc) => {
            const data = doc.data() as EventDocument
            const createdAt = asTimestamp(data.createdAt)
            if (createdAt && (!latestExportedCreatedAt || createdAt.toMillis() > latestExportedCreatedAt.toMillis())) {
                latestExportedCreatedAt = createdAt
            }
            return toRideRow(doc.id, data)
        })
        .filter((row) => row[6])

    await appendRows(sheets, spreadsheetId, ridesTab, rows)
    return { count: rows.length, latestExportedCreatedAt }
}

async function exportRideTags(
    sheets: sheets_v4.Sheets,
    spreadsheetId: string,
    latestCreatedAt: admin.firestore.Timestamp | null
): Promise<number> {
    await ensureHeaders(sheets, spreadsheetId, rideTagsTab, rideTagHeaders)

    let query: FirebaseFirestore.Query = admin.firestore()
        .collection("events")
        .orderBy("createdAt")

    if (latestCreatedAt) {
        query = query.where("createdAt", ">", latestCreatedAt)
    }

    const snapshot = await query.get()
    const rows: string[][] = []

    snapshot.docs.forEach((doc) => {
        const eventData = doc.data() as EventDocument
        const tags = Array.isArray(eventData.tags)
            ? eventData.tags.map((tag) => asString(tag)).filter((tag) => !!tag)
            : []

        tags.forEach((tag) => {
            rows.push([doc.id, tag])
        })
    })

    await appendRows(sheets, spreadsheetId, rideTagsTab, rows)
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
    const latestCreatedAt = await getLatestTimestampFromLastRow(
        sheets,
        spreadsheetId,
        signupsTab,
        "F",
        1
    )
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
    const lastRow = await getLastRowValues(sheets, secrets.google.sheetId, membershipTab, "F")

    if (shouldSkipMembershipExportFromLastRow(lastRow, exportDate)) {
        logger.info(`Membership export skipped for ${getMonthKey(exportDate)}; rows already exist`)
        return
    }

    const rows = createMembershipRows(records, exportDate)
    await appendRows(sheets, secrets.google.sheetId, membershipTab, rows)
    logger.info(`Membership export appended ${rows.length} rows for ${exportDate}`)
})

export const ExportActivitiesToSheets = onSchedule({
    schedule: "15 5 * * *",
    timeZone: "Europe/London",
    region,
    retryCount: 5,
    secrets: [appSecretsParam]
}, async () => {
    const secrets = getAppSecrets()
    const sheets = await createSheetsClient()
    let latestRidesCreatedAt = await getRidesLatestCreatedAtCheckpoint(sheets, secrets.google.sheetId)
    if (!latestRidesCreatedAt) {
        latestRidesCreatedAt = await getLatestTimestampFromLastRow(
            sheets,
            secrets.google.sheetId,
            ridesTab,
            "L",
            6
        )
    }

    const ridesResult = await exportRides(sheets, secrets.google.sheetId, latestRidesCreatedAt)
    const rideTagsExported = await exportRideTags(sheets, secrets.google.sheetId, latestRidesCreatedAt)
    if (ridesResult.latestExportedCreatedAt) {
        await setRidesLatestCreatedAtCheckpoint(
            sheets,
            secrets.google.sheetId,
            ridesResult.latestExportedCreatedAt
        )
    }
    const signupsExported = await exportSignups(sheets, secrets.google.sheetId)

    logger.info(`Activity export complete. Rides: ${ridesResult.count}, Ride tags: ${rideTagsExported}, Signups: ${signupsExported}`)
})