import { defineSecret } from "firebase-functions/params"
import { onMessagePublished } from "firebase-functions/pubsub"
import { decodeMembersCsv } from "./shared"
const apiKey = defineSecret('MAILERLITE_API_KEY')
const region = 'europe-west2'

type BatchRequest = {
    method: string
    path: string
    body?: {
        email: string
        fields: {
            name: string
            last_name: string
            membership: string
        }
    }
}

export const SendMembersToMailerlite = onMessagePublished({
    topic: "all-members", region, secrets: [apiKey]
}, async (event) => {
    const records = decodeMembersCsv(event)

    console.log(`Updating mailerlite ${records.length} records`)
    let currentEmails = await getCurrentSubscribers()

    let addRequests = records.map(row => (
        { "method": "POST", "path": "/api/subscribers", "body": { "email": row.Email, fields: { name: row["First name"], last_name: row["Last name"], membership: row.Membership } } }
    ))
    let deleteRequests = currentEmails.filter(e => !addRequests.some(r => r.body.email.trim().toLowerCase() == e.email.trim().toLowerCase()))
        .map(e => (
            { "method": "DELETE", "path": `/api/subscribers/${e.id}` }
        ))

    await sendBatch([...addRequests, ...deleteRequests])
})

async function sendBatch(requests: BatchRequest[]) {
    let url = "https://connect.mailerlite.com/api/batch"
    for (let i = 0; i < requests.length; i += 50) {
        let response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                requests: requests.slice(i, i + 50)
            }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.value()}`
            }
        })

        let decoded = await response.json() as { total: number, failed: number, responses: { code: number, body: string }[] }

        if (decoded.failed > 0)
            console.log(`Sent batch: total: ${decoded.total} failed ${decoded.failed}`)

        console.log("Failures", decoded.responses.filter(r => r.code >= 400))
    }
}

async function getCurrentSubscribers() {
    let url = "https://connect.mailerlite.com/api/subscribers"
    let emails = [] as { id: string, email: string }[]
    while (url) {
        let response = await fetch(url, {
            method: 'GET',
            headers: {
                authorization: `Bearer ${apiKey.value()}`
            }
        })
        let records = await response.json() as { data: { id: string, email: string }[], links: { next: string } }
        emails = emails.concat(records.data.map(d => ({ id: d.id, email: d.email })))
        url = records.links?.next
    }

    console.log(`${emails.length} currently active subscribers`)
    return emails
}