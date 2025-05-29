import * as logger from "firebase-functions/logger"
import { MessagePublishedData, onMessagePublished } from "firebase-functions/v2/pubsub"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { MemberEntry, retrieveMembers } from "./retriever"
import admin from "firebase-admin"
import { parse } from "csv-parse/sync"
import { defineSecret } from "firebase-functions/params"
import { CloudEvent } from "firebase-functions/core"

export * from './mailerlite'

admin.initializeApp()

const mm_email = defineSecret('MM_USERNAME')
const mm_password = defineSecret('MM_PASSWORD')
const secrets = [mm_email, mm_password]
const region = 'europe-west2'

function refreshMembers(validationLink?: string) {
    return retrieveMembers(validationLink, mm_email.value(), mm_password.value())
}

export const RefreshMembers = onMessagePublished({
    topic: "refresh-members",
    secrets, region
}, (event) => {
    const message = event.data.message.json
    logger.info("Received refresh members request", message)
    return refreshMembers(message.validationLink)
})

export const SendMembersToFirestore = onMessagePublished({
    topic: "all-members", region
}, async (event) => {
    const csvString = Buffer.from(event.data.message.data, "base64").toString()
    const records = parse(csvString, { delimiter: ",", columns: true }) as MemberEntry[]
    const bulkWriter = admin.firestore().bulkWriter()
    const membersCollection = admin.firestore().collection('members')
    const mappedRecords = records
        .filter(r => r.Email)
        .map(r => ({
            email: r["Email"],
            firstName: r["First name"],
            lastName: r["Last name"],
            rideLeader: r["Ride Leader"],
            membership: r.Membership
        }))

    var snapshots = await membersCollection.get()
    for (const doc of snapshots.docs.filter(x => mappedRecords.some(y => y.email == x.id))) {
        bulkWriter.delete(doc.ref)
    }
    for (const record of mappedRecords) {
        bulkWriter.set(membersCollection.doc(record.email), record)
    }
    await bulkWriter.close()
    logger.info(`Converted ${records.length} records`)
})

export function decodeMembersCsv(event: CloudEvent<MessagePublishedData<any>>) {
    const csvString = Buffer.from(event.data.message.data, "base64").toString()
    return (parse(csvString, { delimiter: ",", columns: true }) as MemberEntry[])
        .filter(x => x.Email)
}

export const SendMembersToAuth = onMessagePublished({
    topic: "all-members", region
}, async (event) => {
    const records = decodeMembersCsv(event)
    const auth = admin.auth()

    const existingUsers = new Map<string, admin.auth.UserRecord>()
    let nextPageToken: string | undefined
    do {
        const listUsersResult = await auth.listUsers(1000, nextPageToken)
        listUsersResult.users.forEach(user => {
            existingUsers.set(user.email!, user)
        })
        nextPageToken = listUsersResult.pageToken
    } while (nextPageToken)

    logger.info(`Retrieved ${existingUsers.keys.length} existing users`)

    let updated = 0, created = 0
    records.forEach(async record => {
        let user = existingUsers.get(record.Email)
        if (!user) {
            user = await auth.createUser({
                email: record.Email,
                displayName: `${record["First name"]} ${record["Last name"]}`,
            })
            created++
        }

        const claims = {
            roles: [
                'member',
                ...record["Ride Leader"].toLowerCase() == 'yes' ? ['leader'] : [],
                ...record["Site role"].toLowerCase() == 'admin' ? ['admin'] : []
            ],
            membership: record.Membership
        }

        try {
            if (user.customClaims?.membership !== claims.membership
                || user.customClaims?.roles.join() !== claims.roles.join()) {
                await auth.setCustomUserClaims(user.uid, claims)
                updated++
            }
        } catch (error) {
            logger.error(`Error setting claims for user ${record.email}:`, error)
        }
    })

    logger.info(`Updated claims for ${records.length} records. Updated: ${updated} Created: ${created}`)
})

export const Scheduler = onSchedule({
    schedule: "0 4,16 * * *",
    timeZone: "Europe/London",
    secrets, region
}, () => {
    logger.info("Schedule started")
    return refreshMembers()
})
