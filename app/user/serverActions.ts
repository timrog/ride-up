'use server'
import { createHash, randomBytes } from 'crypto'
import admin from 'firebase-admin'
import { getAdminApp } from '@/lib/firebase/serverApp'
import { getAppSecrets } from '@/lib/secrets'
import { withSpan } from '@/lib/tracing'
import { SpanStatusCode } from "@opentelemetry/api"
import nodemailer from 'nodemailer'
import { SendEmailSignInCodeResponse, VerifyEmailSignInCodeResponse, SignInCode } from './types'

const resendCooldown = 30 * 1000
const retryCooldown = 15 * 60 * 1000
const numberOfAttemptsBeforeLockout = 10

function generateEmailSignInCode(): { code: string; hash: string } {
    const code = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, '0')
    const hash = createHash('sha256').update(code).digest('hex')
    return { code, hash }
}

async function checkEmailMembership(email: string): Promise<{ exists: boolean; userId?: string; isMember: boolean }> {
    const auth = getAdminApp().auth()
    try {
        const user = await auth.getUserByEmail(email)
        const roles = user.customClaims?.roles
        const isMember = Array.isArray(roles) && roles.includes('member')
        return { exists: true, userId: user.uid, isMember }
    } catch (error: unknown) {
        if ((error as { code?: string }).code === 'auth/user-not-found') {
            return { exists: false, isMember: false }
        }
        throw error
    }
}

async function sendEmailSignInCodeEmail(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    return withSpan('sendEmailSignInCodeEmail', async () => {
        try {
            // In development, log the code to console instead of sending email
            if (process.env.NODE_ENV === 'development') {
                console.log(`\n📧 Email Code Sign-In: ${email}`)
                console.log(`🔐 Verification Code: ${code}`)
                console.log(`⏰ Expires in: 15 minutes\n`)
                return { success: true }
            }

            const secrets = getAppSecrets()
            const { smtp } = secrets

            const transporter = nodemailer.createTransport({
                host: smtp.host,
                port: smtp.port,
                secure: smtp.port === 465,
                auth: {
                    user: smtp.user,
                    pass: smtp.password,
                },
            })

            await transporter.sendMail({
                from: `VCGH <${smtp.fromEmail}>`,
                to: email,
                subject: 'Your VCGH Signups Verification Code',
                text: `Your verification code is: ${code}\n\nThis code expires in 15 minutes.`,
                html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 15 minutes.</p>`,
            })

            return { success: true }
        } catch (error) {
            console.error('Failed to send verification email', error)
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to send email',
            }
        }
    })
}

export async function sendEmailSignInCode(
    email: string
): Promise<SendEmailSignInCodeResponse> {
    return withSpan('serverAction.sendEmailSignInCode', async (span) => {
        const normalizedEmail = email.toLowerCase().trim()
        span.setAttribute('user.email', normalizedEmail)

        try {
            const db = getAdminApp().firestore()
            const now = Date.now()

            // Get all codes for this email and filter in memory
            const codesQuery = await db
                .collection('signInCodes')
                .where('email', '==', normalizedEmail)
                .get()

            const codes = codesQuery.docs.map(doc => doc.data() as SignInCode)

            // Check for lockout
            const lockoutCode = codes.find(c => c.lockExpiresAt && c.lockExpiresAt.toMillis() > now)
            if (lockoutCode) {
                span.setAttribute('lockoutActive', true)
                return {
                    success: false,
                    error: 'Too many failed attempts. Please try again later.',
                    nextResendAt: (lockoutCode.lockExpiresAt?.toMillis() || now) + 1000,
                }
            }

            // Check resend cooldown (30 seconds) - find most recent non-invalidated code
            const recentCode = codes.find(c => 
                !c.invalidatedAt && 
                c.createdAt.toMillis() > now - resendCooldown
            )
            if (recentCode) {
                const nextResendAt = (recentCode.createdAt?.toMillis() || now) + resendCooldown
                span.setAttribute('resendCooldownActive', true)
                return {
                    success: false,
                    error: 'Please wait 30 seconds before requesting another code.',
                    nextResendAt,
                }
            }

            // Generate new code
            const { code, hash } = generateEmailSignInCode()

            // Use transaction to atomically invalidate old codes and create new one
            await db.runTransaction(async (transaction) => {
                // Query and delete old codes for this email
                const oldCodesQuery = await db
                    .collection('signInCodes')
                    .where('email', '==', normalizedEmail)
                    .where('invalidatedAt', '==', null)
                    .get()

                oldCodesQuery.docs.forEach((doc) => {
                    transaction.update(doc.ref, {
                        invalidatedAt: admin.firestore.Timestamp.now(),
                    })
                })

                // Create new code document
                const newCodeRef = db.collection('signInCodes').doc()
                transaction.set(newCodeRef, {
                    email: normalizedEmail,
                    codeHash: hash,
                    createdAt: admin.firestore.Timestamp.now(),
                    expiresAt: admin.firestore.Timestamp.fromDate(new Date(now + retryCooldown)),
                    usedAt: null,
                    invalidatedAt: null,
                    failedAttempts: 0,
                    lockExpiresAt: null,
                })
            })

            // Send email with code
            const emailResult = await sendEmailSignInCodeEmail(normalizedEmail, code)
            if (!emailResult.success) {
                // Code was stored but email failed to send - return error
                console.error('Email send failed after storing code', { email: normalizedEmail, error: emailResult.error })
                span.setAttribute('emailSendFailed', true)
                return {
                    success: false,
                    error: 'Verification code generated but failed to send. Please try again.',
                }
            }

            console.log('Verification code sent', { action: 'sendEmailSignInCode', email: normalizedEmail })
            return { success: true }
        } catch (error) {
            span.setAttribute('error.message', error.toString())
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
            console.error('Error sending email sign-in code:', error)
            return {
                success: false,
                error: 'Failed to send verification code. Please try again.',
            }
        }
    })
}

export async function verifyEmailSignInCode(
    email: string,
    code: string
): Promise<VerifyEmailSignInCodeResponse> {
    return withSpan('serverAction.verifyEmailSignInCode', async (span) => {
        const normalizedEmail = email.toLowerCase().trim()
        span.setAttribute('email', normalizedEmail)

        try {
            if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
                return {
                    success: false,
                    error: 'Invalid verification code format.',
                }
            }

            const db = getAdminApp().firestore()
            const auth = getAdminApp().auth()
            const now = Date.now()

            // Get all codes for this email and filter in memory
            const codesQuery = await db
                .collection('signInCodes')
                .where('email', '==', normalizedEmail)
                .get()

            const codes = codesQuery.docs.map(doc => ({ ...doc.data() as SignInCode, ref: doc.ref }))

            // Check for lockout
            const lockoutCode = codes.find(c => c.lockExpiresAt && c.lockExpiresAt.toMillis() > now)
            if (lockoutCode) {
                const lockoutRemainingMs = (lockoutCode.lockExpiresAt?.toMillis() || now) - now
                span.setAttribute('lockoutActive', true)
                return {
                    success: false,
                    error: 'Too many failed attempts. Please try again later.',
                    lockoutRemainingMs: Math.max(0, lockoutRemainingMs),
                }
            }

            // Find latest active code (non-expired, non-used, non-invalidated)
            const codeRecord = codes
                .filter(c => 
                    c.expiresAt.toMillis() > now &&
                    !c.invalidatedAt &&
                    !c.usedAt
                )
                .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))[0]

            if (!codeRecord) {
                return {
                    success: false,
                    error: 'Verification code not found or expired.',
                }
            }

            const codeHash = createHash('sha256').update(code).digest('hex')

            span.setAttribute('codeMatches', codeHash === codeRecord.codeHash)
            // Check if code matches
            if (codeHash !== codeRecord.codeHash) {
                // Increment failed attempts
                let newFailedAttempts = codeRecord.failedAttempts + 1
                const updateData: Record<string, any> = {
                    failedAttempts: newFailedAttempts,
                }

                // Set lockout if threshold reached
                const isLockedOut = newFailedAttempts >= numberOfAttemptsBeforeLockout
                if (isLockedOut) {
                    updateData.lockExpiresAt = admin.firestore.Timestamp.fromDate(new Date(now + retryCooldown))
                }

                await codeRecord.ref.update(updateData)

                span.setAttribute('isLockedOut', isLockedOut)
                return {
                    success: false,
                    error: isLockedOut
                        ? 'Too many failed attempts. Please try again in 15 minutes.'
                        : `Invalid verification code. Check and try again.`,
                    ...(isLockedOut && { lockoutRemainingMs: 15 * 60 * 1000 }),
                }
            }

            // Code is valid - mark as used and get user
            const membership = await checkEmailMembership(normalizedEmail)
            await codeRecord.ref.update({
                usedAt: admin.firestore.Timestamp.now(),
            })

            span.setAttribute('membershipExists', membership.exists)
            span.setAttribute('membershipIsMember', membership.isMember)
            if (!membership.exists || !membership.userId || !membership.isMember) {
                return {
                    success: false,
                    notMember: true,
                    error: 'No membership is associated with that account. Check your details.',
                }
            }

            // Create custom token for sign-in
            const customToken = await auth.createCustomToken(membership.userId)

            return {
                success: true,
                customToken,
            }
        } catch (error) {
            span.setAttribute('error.message', error.toString())
            span.setStatus({ code: SpanStatusCode.ERROR, message: error.toString() })
            console.error('Error verifying email sign-in code:', error)
            return {
                success: false,
                error: 'Failed to verify code. Please try again.',
            }
        }
    })
}
