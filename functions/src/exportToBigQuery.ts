import admin from "firebase-admin"
import * as logger from "firebase-functions/logger"
import { onMessagePublished } from "firebase-functions/v2/pubsub"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { BigQuery, Table } from "@google-cloud/bigquery"
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
const checkpointsCollection = "_exportCheckpoints"
const checkpointsDocumentId = "bigquery"
const signupsCheckpointField = "signupsLatestCreatedAt"

const defaultMembersTableId = "members"
const defaultActivitiesTableId = "activities"
const defaultSignupsTableId = "signups"

type AuthUserClaims = {
    membership?: string
    demographics?: {
        gender?: string
        ageRange?: string
    }
}

type MemberDemographics = {
    membershipType: string
    gender: string
    ageRange: string
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

type SignupRecord = {
    createdAt?: unknown
    userId?: unknown
    membership?: unknown
}

type BigQueryConfig = {
    projectId?: string
    datasetId: string
    membersTableId: string
    activitiesTableId: string
    signupsTableId: string
}

type BigQueryInsertRow = {
    insertId: string
    json: Record<string, string | number | boolean | null | Date | string[]>
}

type BigQueryInsertFailure = {
    errors: Array<{ message: string; reason: string }>
    row: BigQueryInsertRow
}

type BigQueryPartialFailureError = Error & {
    errors?: BigQueryInsertFailure[]
}

type BigQueryField = {
    name: string
    type: string
    mode?: "REPEATED"
}

function getErrorDetails(error: unknown): { name: string; message: string; stack?: string } {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack
        }
    }

    return {
        name: "UnknownError",
        message: String(error)
    }
}

const membersSchema: BigQueryField[] = [
    { name: "export_date", type: "DATE" },
    { name: "membership_type", type: "STRING" },
    { name: "gender", type: "STRING" },
    { name: "age_range", type: "STRING" },
    { name: "outward_postcode", type: "STRING" },
    { name: "leader", type: "BOOLEAN" }
]

const activitiesSchema: BigQueryField[] = [
    { name: "activity_id", type: "STRING" },
    { name: "title", type: "STRING" },
    { name: "event_date", type: "TIMESTAMP" },
    { name: "duration", type: "FLOAT" },
    { name: "location", type: "STRING" },
    { name: "route_link", type: "STRING" },
    { name: "created_at", type: "TIMESTAMP" },
    { name: "created_by", type: "STRING" },
    { name: "created_by_name", type: "STRING" },
    { name: "link_id", type: "STRING" },
    { name: "tags", type: "STRING", mode: "REPEATED" },
    { name: "is_cancelled", type: "BOOLEAN" }
]

const signupsSchema: BigQueryField[] = [
    { name: "activity_id", type: "STRING" },
    { name: "created_at", type: "TIMESTAMP" },
    { name: "user_id", type: "STRING" },
    { name: "membership_type", type: "STRING" },
    { name: "gender", type: "STRING" },
    { name: "age_range", type: "STRING" }
]

function getExportDateIso(nowDate: Date = new Date()): string {
    return nowDate.toISOString().slice(0, 10)
}

function getMonthStart(exportDate: string): string {
    return `${exportDate.slice(0, 7)}-01`
}

function asString(value: unknown): string {
    if (typeof value === "string") return value
    if (typeof value === "number") return `${value}`
    if (typeof value === "boolean") return value ? "true" : "false"
    return ""
}

function asNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) return parsed
    }
    return null
}

function asBoolean(value: unknown): boolean | null {
    if (typeof value === "boolean") return value
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase()
        if (normalized === "true" || normalized === "yes") return true
        if (normalized === "false" || normalized === "no") return false
    }
    return null
}

function asTimestamp(value: unknown): admin.firestore.Timestamp | null {
    if (value instanceof admin.firestore.Timestamp) return value
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return admin.firestore.Timestamp.fromDate(value)
    }
    if (typeof value === "string") {
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) {
            return admin.firestore.Timestamp.fromDate(parsed)
        }
    }
    return null
}

function asDate(value: unknown): Date | null {
    const ts = asTimestamp(value)
    return ts ? ts.toDate() : null
}

function getBigQueryConfig(): BigQueryConfig {
    const secrets = getAppSecrets()
    const datasetId = process.env.BQ_DATASET_ID || secrets.google.bigQueryDatasetId

    if (!datasetId) {
        throw new Error("BigQuery dataset ID is required. Set BQ_DATASET_ID or APP_SECRETS.google.bigQueryDatasetId")
    }

    return {
        projectId: process.env.BQ_PROJECT_ID || secrets.google.bigQueryProjectId || undefined,
        datasetId,
        membersTableId: process.env.BQ_MEMBERS_TABLE_ID || defaultMembersTableId,
        activitiesTableId: process.env.BQ_ACTIVITIES_TABLE_ID || defaultActivitiesTableId,
        signupsTableId: process.env.BQ_SIGNUPS_TABLE_ID || defaultSignupsTableId
    }
}

function createBigQueryClient(config: BigQueryConfig): BigQuery {
    return new BigQuery({ projectId: config.projectId })
}

function getTable(client: BigQuery, config: BigQueryConfig, tableId: string): Table {
    return client.dataset(config.datasetId).table(tableId)
}

async function ensureTable(
    client: BigQuery,
    config: BigQueryConfig,
    tableId: string,
    schema: BigQueryField[]
): Promise<Table> {
    const table = getTable(client, config, tableId)
    const [exists] = await table.exists()
    if (exists) return table

    try {
        const [createdTable] = await table.create({ schema })
        logger.info(`Created BigQuery table ${config.datasetId}.${tableId}`)
        return createdTable
    } catch (error) {
        const [createdByAnotherInvocation] = await table.exists()
        if (createdByAnotherInvocation) return table
        throw error
    }
}

async function insertRows(table: Table, rows: BigQueryInsertRow[]): Promise<void> {
    if (rows.length === 0) return

    try {
        await table.insert(rows, { raw: true })
    } catch (error) {
        if (error instanceof Error && error.name === "PartialFailureError") {
            const partialFailure = error as BigQueryPartialFailureError
            logger.error("BigQuery row insertion failed", {
                table: table.id,
                failures: (partialFailure.errors || []).map((failure) => ({
                    insertId: failure.row.insertId,
                    errors: failure.errors
                }))
            })
        }
        throw error
    }
}

async function truncateTable(client: BigQuery, config: BigQueryConfig, tableId: string): Promise<void> {
    const projectId = config.projectId || await client.getProjectId()
    const query = `TRUNCATE TABLE \`${projectId}.${config.datasetId}.${tableId}\``
    await client.query({ query, location: region })
}

async function hasMembershipExportForMonth(
    client: BigQuery,
    config: BigQueryConfig,
    exportDate: string
): Promise<boolean> {
    const projectId = config.projectId || await client.getProjectId()
    const query = `
        SELECT EXISTS(
            SELECT 1
            FROM \`${projectId}.${config.datasetId}.${config.membersTableId}\`
            WHERE export_date >= @monthStart
              AND export_date < DATE_ADD(@monthStart, INTERVAL 1 MONTH)
        ) AS has_export
    `
    const [rows] = await client.query({
        query,
        location: region,
        params: { monthStart: getMonthStart(exportDate) }
    })
    const result = rows[0] as { has_export?: unknown } | undefined
    return result?.has_export === true
}

async function getCheckpoint(field: string): Promise<admin.firestore.Timestamp | null> {
    const doc = await admin.firestore().collection(checkpointsCollection).doc(checkpointsDocumentId).get()
    if (!doc.exists) return null
    return asTimestamp(doc.get(field))
}

async function setCheckpoint(field: string, timestamp: admin.firestore.Timestamp): Promise<void> {
    await admin.firestore().collection(checkpointsCollection).doc(checkpointsDocumentId).set({
        [field]: timestamp
    }, { merge: true })
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

function tagsArray(value: unknown): string[] {
    if (!Array.isArray(value)) return []
    return value.map((tag) => asString(tag)).filter((tag) => !!tag)
}

export const ExportMembershipToBigQuery = onMessagePublished({
    topic: "all-members",
    region,
    secrets: [appSecretsParam]
}, async (event) => {
    const config = getBigQueryConfig()
    const client = createBigQueryClient(config)
    const membersTable = await ensureTable(client, config, config.membersTableId, membersSchema)

    const exportDate = getExportDateIso()
    if (await hasMembershipExportForMonth(client, config, exportDate)) {
        logger.info(`BigQuery membership export skipped for ${exportDate.slice(0, 7)}; rows already exist`)
        return
    }

    const records = decodeMembersCsv(event)

    const rows: BigQueryInsertRow[] = records
        .filter((record) => !!record.Email)
        .map((record) => {
            const email = asString(record.Email).toLowerCase()
            return {
                insertId: `${exportDate}:${email}`,
                json: {
                    export_date: exportDate,
                    membership_type: asString(record.Membership) || "Unknown",
                    gender: normalizeGender(record.Gender),
                    age_range: getAgeRangeFromDob(record["Date of birth"]),
                    outward_postcode: getOutwardPostcode(record.Postcode),
                    leader: normalizeLeader(record["Ride Leader"])
                }
            }
        })

    await insertRows(membersTable, rows)
    logger.info(`BigQuery membership export complete. Rows: ${rows.length}, dataset: ${config.datasetId}, table: ${config.membersTableId}`)
})

export const ExportActivitiesToBigQuery = onSchedule({
    schedule: "15 5 * * *",
    timeZone: "Europe/London",
    region,
    retryCount: 5,
    secrets: [appSecretsParam]
}, async () => {
    let stage = "loading configuration"

    try {
        const config = getBigQueryConfig()
        const client = createBigQueryClient(config)

        stage = "ensuring tables"
        const activitiesTable = await ensureTable(client, config, config.activitiesTableId, activitiesSchema)
        const signupsTable = await ensureTable(client, config, config.signupsTableId, signupsSchema)

        stage = "loading signup checkpoint"
        const signupsLatestCreatedAt = await getCheckpoint(signupsCheckpointField)

        stage = "truncating activities"
        await truncateTable(client, config, config.activitiesTableId)

        stage = "loading activities"
        const eventQuery: FirebaseFirestore.Query = admin.firestore()
            .collection("events")
            .orderBy("createdAt")
        const eventsSnapshot = await eventQuery.get()
        const activityRows: BigQueryInsertRow[] = []

        eventsSnapshot.docs.forEach((doc) => {
            const data = doc.data() as EventDocument
            const createdAt = asTimestamp(data.createdAt)
            if (!createdAt) return

            activityRows.push({
                insertId: doc.id,
                json: {
                    activity_id: doc.id,
                    title: asString(data.title),
                    event_date: asDate(data.date),
                    duration: asNumber(data.duration),
                    location: asString(data.location),
                    route_link: asString(data.routeLink),
                    created_at: createdAt.toDate(),
                    created_by: asString(data.createdBy),
                    created_by_name: asString(data.createdByName),
                    link_id: asString(data.linkId),
                    tags: tagsArray(data.tags),
                    is_cancelled: asBoolean(data.isCancelled)
                }
            })
        })

        stage = "inserting activities"
        await insertRows(activitiesTable, activityRows)

        stage = "loading member demographics"
        const demographicsByUid = await loadMemberDemographics()
        stage = "loading signups"
        const activitySnapshot = await admin.firestore().collectionGroup("activity").get()

        const signupRows: BigQueryInsertRow[] = []
        let latestSignupCreatedAt: admin.firestore.Timestamp | null = null

        activitySnapshot.docs.forEach((doc) => {
            if (doc.id !== "private") return
            const eventId = doc.ref.parent.parent?.id
            if (!eventId) return

            const data = doc.data() as { signups?: unknown }
            if (!data.signups || typeof data.signups !== "object") return

            Object.values(data.signups as Record<string, SignupRecord>).forEach((signup) => {
                const createdAt = asTimestamp(signup.createdAt)
                if (!createdAt) return
                if (signupsLatestCreatedAt && createdAt.toMillis() <= signupsLatestCreatedAt.toMillis()) return

                if (!latestSignupCreatedAt || createdAt.toMillis() > latestSignupCreatedAt.toMillis()) {
                    latestSignupCreatedAt = createdAt
                }

                const userId = asString(signup.userId)
                if (!userId) return

                const demographics = demographicsByUid.get(userId)
                signupRows.push({
                    insertId: `${eventId}:${userId}:${createdAt.toMillis()}`,
                    json: {
                        activity_id: eventId,
                        created_at: createdAt.toDate(),
                        user_id: userId,
                        membership_type: demographics?.membershipType || asString(signup.membership) || "Unknown",
                        gender: demographics?.gender || "Unknown",
                        age_range: demographics?.ageRange || "Unknown"
                    }
                })
            })
        })

        stage = "inserting signups"
        await insertRows(signupsTable, signupRows)
        if (latestSignupCreatedAt) {
            stage = "saving signup checkpoint"
            await setCheckpoint(signupsCheckpointField, latestSignupCreatedAt)
        }

        logger.info(
            `BigQuery activity export complete. Activities refreshed: ${activityRows.length}, Signups: ${signupRows.length}, dataset: ${config.datasetId}, activitiesTable: ${config.activitiesTableId}, signupsTable: ${config.signupsTableId}`
        )
    } catch (error) {
        logger.error("BigQuery activity export failed", { stage, error: getErrorDetails(error) })
        throw error
    }
})
