import * as logger from "firebase-functions/logger"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { retrieveMembers } from "./retriever"
import { defineSecret } from "firebase-functions/params"

const mm_email = defineSecret('MM_USERNAME')
const mm_password = defineSecret('MM_PASSWORD')
const secrets = [mm_email, mm_password]
const region = 'europe-west2'

export const Scheduler = onSchedule({
    schedule: "0 4,16 * * *",
    timeZone: "Europe/London",
    secrets, region
}, () => {
    logger.info("Schedule started")
    return retrieveMembers(undefined, mm_email.value(), mm_password.value())
})
