import { MessagePublishedData } from "firebase-functions/v2/pubsub"
import { CloudEvent } from "firebase-functions/core"
import { parse } from "csv-parse/sync"
import { MemberEntry } from "./refreshMembers"

export function decodeMembersCsv(event: CloudEvent<MessagePublishedData<any>>) {
    const csvString = Buffer.from(event.data.message.data, "base64").toString()
    return (parse(csvString, { delimiter: ",", columns: true }) as MemberEntry[])
        .filter(x => x.Email)
}

export type MemberPhotoMessage = {
    photoUrl: string,
    email: string,
    uid: string,
    cookies: string[]
}
