import * as logger from "firebase-functions/logger"
import { onMessagePublished } from "firebase-functions/v2/pubsub"
import { decodeMembersCsv } from "./shared"

import admin from "firebase-admin"

const region = 'europe-west2'

export const SendMembersToFirestore = onMessagePublished({
    topic: "all-members", region
}, async (event) => {
    const records = decodeMembersCsv(event)
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
