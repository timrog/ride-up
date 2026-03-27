import { Timestamp } from "firebase/firestore"

export interface SignInCode {
    email: string
    codeHash: string
    createdAt: Timestamp
    expiresAt: Timestamp
    usedAt?: Timestamp | null
    invalidatedAt?: Timestamp | null
    failedAttempts: number
    lockExpiresAt?: Timestamp | null
}

export interface SendEmailSignInCodeResponse {
    success: boolean
    error?: string
    nextResendAt?: number // Unix timestamp in ms when next resend is allowed
}

export interface VerifyEmailSignInCodeResponse {
    success: boolean
    customToken?: string // JWT token for custom sign-in
    notMember?: boolean
    error?: string
    lockoutRemainingMs?: number // Milliseconds remaining in lockout period
}
