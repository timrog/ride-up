import * as logger from "firebase-functions/logger"
import { onMessagePublished } from "firebase-functions/v2/pubsub"
import { retrieveMembers } from "./retriever"
import { defineSecret } from "firebase-functions/params"

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
