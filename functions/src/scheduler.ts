import * as logger from "firebase-functions/logger"
import { onSchedule } from "firebase-functions/v2/scheduler"
import { retrieveMembers } from "./refreshMembers"
import { appSecretsParam } from "./index"

const region = 'europe-west2'

export const Scheduler = onSchedule({
    schedule: "0 4,16 * * *",
    timeZone: "Europe/London",
    region, secrets: [appSecretsParam]
}, () => {
    logger.info("Schedule started")
    return retrieveMembers(undefined)
})
