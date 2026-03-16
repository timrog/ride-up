import * as logger from "firebase-functions/logger"
import { onMessagePublished } from "firebase-functions/v2/pubsub"
import { decodeMembersCsv, MemberPhotoMessage } from "./shared"
import admin from "firebase-admin"
import { PubSub } from '@google-cloud/pubsub'

const region = 'europe-west2'

function formatE164PhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/^(t:)?(0|\+?44)?/g, '+44').replace(/[^\d+]/g, '')
}

type MemberRecord = ReturnType<typeof decodeMembersCsv>[number]

type UserClaims = {
    roles: string[]
    membership: string
    phone: string | null
    extraUsers?: Array<{ displayName: string; phone: string | null }>
}

function getDisplayName(record: MemberRecord): string | null {
    if(!record["First name"] && !record["Last name"]) {
        return null
    }
    return `${record["First name"]} ${record["Last name"]}`.trim()
}

function getPhoneNumber(record: MemberRecord): string | null {
    return record["Members directory"]?.toLowerCase() === 'yes' && record["Mobile number"]
        ? formatE164PhoneNumber(record["Mobile number"])
        : null
}

function getRoles(record: MemberRecord | undefined): string[] {
    const roles = new Set<string>()
    if (record) {
        roles.add('member')
        if (record["Ride Leader"]?.toLowerCase() === 'yes') roles.add('leader')
        if (record["Site role"]?.toLowerCase() === 'admin') roles.add('admin')
    }
    return [...roles]
}

function getExtraUsers(duplicateRecords: MemberRecord[], incoming: MemberRecord | undefined): Array<{ displayName: string; phone: string | null }> {
    const extraUsers: Array<{ displayName: string; phone: string | null }> = []
    if (duplicateRecords.length > 1) {
        duplicateRecords.forEach(record => {
            if (record === incoming) return
            const displayName = getDisplayName(record)
            if(!displayName) return

            extraUsers.push({
                displayName,
                phone: getPhoneNumber(record)
            })
        })
    }

    return extraUsers
}

function getClaims(roles: string[], membership: string, phone: string | null, extraUsers: Array<{ displayName: string; phone: string | null }>): UserClaims {
    const claims: UserClaims = {
        roles,
        membership,
        phone
    }

    if (extraUsers.length > 0) {
        claims.extraUsers = extraUsers
    }

    return claims
}

function groupRecordsByEmail(records: MemberRecord[]): Map<string, MemberRecord[]> {
    const emailGroups = new Map<string, MemberRecord[]>()
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

    return emailGroups
}

async function loadExistingAuthUsers(auth: admin.auth.Auth): Promise<Map<string, admin.auth.UserRecord>> {
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
    return existingUsers
}

async function loadCookieValues(): Promise<string[]> {
    const cookieDoc = await admin.firestore().doc('functions/cookie').get()
    return cookieDoc.get('values') as string[] || []
}

export const SendMembersToAuth = onMessagePublished({
    topic: "all-members", region
}, async (event) => {
    const records = decodeMembersCsv(event)
    const emailGroups = groupRecordsByEmail(records)
    const newUsers = new Map(records.map(r => [r.Email.toLowerCase(), r]))
    const auth = admin.auth()
    const existingUsers = await loadExistingAuthUsers(auth)
    const cookieValues = await loadCookieValues()

    let updated = 0, created = 0, photosQueued = 0, profilesUpdated = 0
    const keys = new Set<string>([...newUsers.keys(), ...existingUsers.keys()])
    const pubsub = new PubSub()
    const photoTopic = pubsub.topic('member-photos')

    const getOrCreateUser = async (
        key: string,
        incoming?: MemberRecord
    ): Promise<admin.auth.UserRecord> => {
        const existing = existingUsers.get(key)
        const displayName = incoming ? getDisplayName(incoming) : null
        const phoneNumber = incoming ? getPhoneNumber(incoming) : null
        if (!existing) {
            const createdUser = await auth.createUser({
                email: incoming!.Email,
                displayName: displayName || null,
                phoneNumber: phoneNumber || null
            })
            created++
            return createdUser
        }

        const updates: admin.auth.UpdateRequest = {}
        if ((!existing.displayName?.trim()
            || existing.displayName.indexOf("undefined") >= 0)
            && displayName) {
            updates.displayName = displayName
        }
        if (existing.phoneNumber !== phoneNumber && phoneNumber) {
            updates.phoneNumber = phoneNumber
        }

        if (Object.keys(updates).length > 0) {
            logger.info(`Updating profile for ${key} with ${JSON.stringify(updates)}`)
            try {
                const updatedUser = await auth.updateUser(existing.uid, updates)
                profilesUpdated++
                return updatedUser
            } catch (error) {
                logger.error(`Error updating user ${key} ${JSON.stringify(updates)}`, error, updates)
                throw error
            }
        }

        return existing
    }

    const updatePhoto = async (
        existing: admin.auth.UserRecord,
        incoming: MemberRecord
    ): Promise<void> => {
        const photoURL = existing.photoURL
        const newPhotoUrl = incoming["Photo"]?.trim()

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

    const updateClaims = async (
        existing: admin.auth.UserRecord | undefined,
        claims: UserClaims,
        key: string
    ): Promise<void> => {
        if (!existing) return

        const existingClaims = existing.customClaims as UserClaims | undefined
        try {
            if (existingClaims?.membership !== claims.membership
                || existingClaims?.roles?.join() !== claims.roles.join()
                || existingClaims?.phone !== claims.phone
                || JSON.stringify(existingClaims?.extraUsers) !== JSON.stringify(claims.extraUsers)) {
                await auth.setCustomUserClaims(existing.uid, claims)
                updated++
            }
        } catch (error) {
            logger.error(`Error setting claims for user ${key}:`, error)
        }
    }

    await Promise.all([...keys].map(async (key) => {
        const incoming = newUsers.get(key)
        const phoneNumber = incoming ? getPhoneNumber(incoming) : null
        const user = await getOrCreateUser(key, incoming)

        if (incoming && user) {
            await updatePhoto(user, incoming)
        }

        const roles = getRoles(incoming)
        const duplicateRecords = emailGroups.get(key) || []
        const extraUsers = getExtraUsers(duplicateRecords, incoming)
        const claims = getClaims(roles, incoming?.Membership || 'none', phoneNumber, extraUsers)
        await updateClaims(user, claims, key)
    }))

    logger.info(`Updated claims for ${newUsers.size} new and ${existingUsers.size} existing users. Updated: ${updated} Created: ${created} Profiles updated: ${profilesUpdated} Photos queued: ${photosQueued}`)
})
