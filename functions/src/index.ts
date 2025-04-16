import * as logger from "firebase-functions/logger"
import { onMessagePublished } from "firebase-functions/v2/pubsub"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { retrieveMembers } from "./retriever"
import admin from "firebase-admin"
import { defineSecret } from "firebase-functions/params"
admin.initializeApp()

const mm_email = defineSecret('MM_USERNAME')
const mm_password = defineSecret('MM_PASSWORD')
const secrets = [mm_email, mm_password]
const region = 'europe-west2'

async function refreshMembers(validationLink?: string) {
    const members = await retrieveMembers(validationLink, mm_email.value(), mm_password.value())
    const bulkWriter = admin.firestore().bulkWriter()
    const membersCollection = admin.firestore().collection('members')
    for (const member of members) {
        if (!member.Email) continue
        bulkWriter.set(membersCollection.doc(member.Email), member)
    }
    await bulkWriter.close()
}

export const RefreshMembers = onMessagePublished({
    topic: "refresh-members",
    secrets, region
}, (event) => {
    const message = event.data.message.json
    logger.info("Received refresh members request", message)

    return refreshMembers(message.validationLink)
})

export const Scheduler = onSchedule({
    schedule: "0 4,16 * * *",
    timeZone: "Europe/London",
    secrets, region
}, () => {
    logger.info("Schedule started")
    return refreshMembers()
})