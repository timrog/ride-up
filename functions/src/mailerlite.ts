import { onMessagePublished } from "firebase-functions/pubsub"
import { getAppSecrets } from "./secrets"
import { decodeMembersCsv } from "./shared"
import { appSecretsParam } from "./index"

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
    topic: "all-members", region, secrets: [appSecretsParam]
}, async (event) => {
    const secrets = getAppSecrets()
    const records = decodeMembersCsv(event)
    const apiKey = secrets.mailerlite.apiKey

    console.log(`Updating mailerlite ${records.length} records`)
    let currentEmails = await getCurrentSubscribers(apiKey)

    let addRequests = records.map(row => (
        { "method": "POST", "path": "/api/subscribers", "body": { "email": row.Email, fields: { name: row["First name"], last_name: row["Last name"], membership: row.Membership } } }
    ))
    let deleteRequests = currentEmails.filter(e => !addRequests.some(r => r.body.email.trim().toLowerCase() == e.email.trim().toLowerCase()))
        .map(e => (
            { "method": "DELETE", "path": `/api/subscribers/${e.id}` }
        ))

    await sendBatch([...addRequests, ...deleteRequests], apiKey)
})

async function sendBatch(requests: BatchRequest[], apiKey: string) {
    let url = "https://connect.mailerlite.com/api/batch"
    for (let i = 0; i < requests.length; i += 50) {
        let response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({
                requests: requests.slice(i, i + 50)
            }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        })

        if (!response.ok) {
            const body = await response.text()
            throw new Error(`MailerLite batch request failed with ${response.status} ${response.statusText}: ${body}`)
        }

        let decoded = await response.json() as { total: number, failed: number, responses: { code: number, body: string }[] }
        const failures = decoded.responses.filter(r => r.code >= 400)

        if (decoded.failed > 0 || failures.length > 0) {
            throw new Error(`MailerLite batch request contained ${decoded.failed} failed operations: ${JSON.stringify(failures)}`)
        }
    }
}

async function getCurrentSubscribers(apiKey: string) {
    let url = "https://connect.mailerlite.com/api/subscribers"
    let emails = [] as { id: string, email: string }[]
    while (url) {
        let response = await fetch(url, {
            method: 'GET',
            headers: {
                authorization: `Bearer ${apiKey}`
            }
        })

        if (!response.ok) {
            const body = await response.text()
            throw new Error(`MailerLite subscribers request failed with ${response.status} ${response.statusText}: ${body}`)
        }

        let records = await response.json() as { data: { id: string, email: string }[], links: { next: string } }
        if (!Array.isArray(records.data)) {
            throw new Error('MailerLite subscribers response did not contain a data array')
        }
        emails = emails.concat(records.data.map(d => ({ id: d.id, email: d.email })))
        url = records.links?.next
    }

    console.log(`${emails.length} currently active subscribers`)
    return emails
}