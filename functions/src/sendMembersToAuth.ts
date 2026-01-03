import * as logger from "firebase-functions/logger"
import { onMessagePublished } from "firebase-functions/v2/pubsub"
import { decodeMembersCsv, MemberPhotoMessage } from "./shared"
import admin from "firebase-admin"
import { PubSub } from '@google-cloud/pubsub'

const region = 'europe-west2'

function formatE164PhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/^(t:)?0/g, '+44').replace(/[^\d+]/g, '')
}

export const SendMembersToAuth = onMessagePublished({
    topic: "all-members", region
}, async (event) => {
    const records = decodeMembersCsv(event)

    const emailGroups = new Map<string, typeof records>()
    records.forEach(r => {
        const email = r.Email.toLowerCase()
        if (!emailGroups.has(email)) {
            emailGroups.set(email, [])
        }
        emailGroups.get(email)!.push(r)
    })

    emailGroups.forEach((group, email) => {
        if (group.length > 1) {
            logger.warn(`Found ${group.length} users with email ${email}: ${group.map(r => `${r["First name"]} ${r["Last name"]}`).join(', ')}`)
        }
    })

    const newUsers = new Map(records.map(r => [r.Email.toLowerCase(), r]))
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

    logger.info(`Retrieved ${existingUsers.size} existing users`)

    const cookieDoc = await admin.firestore().doc('functions/cookie').get()
    const cookieValues = cookieDoc.get('values') as string[] || []

    let updated = 0, created = 0, photosQueued = 0
    const keys = new Set<string>([...newUsers.keys(), ...existingUsers.keys()])
    const pubsub = new PubSub()
    const photoTopic = pubsub.topic('member-photos')

    await Promise.all([...keys].map(async (key) => {
        let existing = existingUsers.get(key)
        let incoming = newUsers.get(key)
        let phoneNumber: string | null = null

        if (incoming) {
            const displayName = `${incoming["First name"]} ${incoming["Last name"]}`.trim()
            phoneNumber = incoming["Members directory"]?.toLowerCase() === 'yes' && incoming["Mobile number"] &&
                formatE164PhoneNumber(incoming["Mobile number"]) || null

            const photoURL = existing?.photoURL
            const newPhotoUrl = incoming["Photo"]?.trim()

            if (!existing) {
                existing = await auth.createUser({
                    email: incoming.Email,
                    displayName
                })
                created++
            }

            if (newPhotoUrl && newPhotoUrl !== photoURL) {
                await photoTopic.publishMessage({
                    json: {
                        photoUrl: newPhotoUrl,
                        email: incoming.Email,
                        uid: existing.uid,
                        cookies: cookieValues
                    } as MemberPhotoMessage
                })

                photosQueued++
            }
        }

        const roles = new Set<string>()
        if (incoming) {
            roles.add('member')
            if (incoming["Ride Leader"]?.toLowerCase() === 'yes') roles.add('leader')
            if (incoming["Site role"]?.toLowerCase() === 'admin') roles.add('admin')
        }

        const extraUsers: Array<{ displayName: string; phone: string | null }> = []
        const duplicateRecords = emailGroups.get(key) || []
        if (duplicateRecords.length > 1) {
            duplicateRecords.forEach(record => {
                if (record === incoming) return

                const name = `${record["First name"]} ${record["Last name"]}`.trim()
                const phone = record["Members directory"]?.toLowerCase() === 'yes' && record["Mobile number"] &&
                    formatE164PhoneNumber(record["Mobile number"]) || null
                extraUsers.push({ displayName: name, phone })
            })
        }

        const claims: any = {
            roles: [...roles],
            membership: incoming?.Membership || 'none',
            phone: phoneNumber
        }

        if (extraUsers.length > 0) {
            claims.extraUsers = extraUsers
        }

        try {
            if (existing && (existing.customClaims?.membership !== claims.membership
                || existing.customClaims?.roles?.join() !== claims.roles.join()
                || existing.customClaims?.phone !== claims.phone
                || JSON.stringify(existing.customClaims?.extraUsers) !== JSON.stringify(claims.extraUsers))) {
                await auth.setCustomUserClaims(existing.uid, claims)
                updated++
            }
        } catch (error) {
            logger.error(`Error setting claims for user ${key}:`, error)
        }
    }))

    logger.info(`Updated claims for ${newUsers.size} new and ${existingUsers.size} existing users. Updated: ${updated} Created: ${created} Photos queued: ${photosQueued}`)
})
