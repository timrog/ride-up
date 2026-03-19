'use client'
import React, { useEffect, useRef, useState } from 'react'
import { addToast, Alert, Button, Form, FormProps, Input } from "@heroui/react"
import { signInWithGoogle } from "@/lib/firebase/auth"
import { checkPhoneNumberExists } from "app/serverActions"
import { sendEmailSignInCode, verifyEmailSignInCode } from "./serverActions"
import {
    ConfirmationResult,
    getAuth,
    IdTokenResult,
    isSignInWithEmailLink,
    RecaptchaVerifier,
    sendSignInLinkToEmail,
    signInWithEmailAndPassword,
    signInWithEmailLink,
    signInWithPhoneNumber,
    signInWithCustomToken,
} from "firebase/auth"
import { useRouter, useSearchParams } from "next/navigation"
import { useRoles } from "app/clientAuth"
import MembershipHelp from "./MembershipHelp"
const phoneEnabled = process.env.NEXT_PUBLIC_PHONE_SIGN_IN_ENABLED !== 'false'

function getEmailCodeSignInEnabled(): boolean {
    if (typeof window === 'undefined') return false
    const value = window.localStorage.getItem('useEmailCodeSignIn')
    return value === 'true'
}

function redirectIfHasRoles(idToken: IdTokenResult, router: ReturnType<typeof useRouter>, returnUrl: string) {
    const tokenRoles = idToken.claims['roles'] as string[] | undefined
    if (tokenRoles && tokenRoles.length > 0) {
        router.push(returnUrl)
    }
}

// ---- Sub-components ----

function LinkHandler({ returnUrl, onWrongBrowser }: {
    returnUrl: string
    onWrongBrowser: () => void
}) {
    const auth = getAuth()
    const router = useRouter()
    const [wrongBrowser, setWrongBrowser] = useState(false)

    useEffect(() => {
        if (!isSignInWithEmailLink(auth, window.location.href)) return
        const email = window.localStorage.getItem('emailForSignIn')
        if (email) {
            signInWithEmailLink(auth, email, window.location.href)
                .then(cred => cred.user.getIdTokenResult().then(idToken => {
                    window.localStorage.removeItem('emailForSignIn')
                    redirectIfHasRoles(idToken, router, returnUrl)
                }))
                .catch((error) => {
                    console.error('Error signing in with email link:', error)
                    addToast({ description: 'Failed to sign in. Please try again.', color: 'danger' })
                })
        } else {
            setWrongBrowser(true)
            onWrongBrowser()
        }
    }, [])

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            addToast({ description: 'Link copied to clipboard!', color: 'success' })
        } catch (error) {
            console.error('Failed to copy link:', error)
            addToast({ description: 'Failed to copy link', color: 'danger' })
        }
    }

    if (!wrongBrowser) return null

    return (
        <Alert color="warning" title="Sign in link opened in wrong browser">
            <div className="flex flex-col gap-3">
                <p>This sign-in link has opened in a different browser to the one where you requested it. To complete your sign-in:</p>
                <ol className="list-decimal list-inside space-y-2">
                    <li>Click the button below to copy the link</li>
                    <li>Switch to the original tab where you requested the sign-in link</li>
                    <li>Paste the link into the address bar and press Enter</li>
                </ol>
                <Button color="warning" variant="flat" onPress={handleCopyLink} className="w-full">
                    Copy link to clipboard
                </Button>
            </div>
        </Alert>
    )
}

function SignInWithGoogle({ returnUrl }: { returnUrl: string }) {
    const auth = getAuth()
    const router = useRouter()

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle()
            const user = auth.currentUser
            if (user) {
                const idToken = await user.getIdTokenResult()
                redirectIfHasRoles(idToken, router, returnUrl)
            }
        } catch (error) {
            console.error('Error signing in with Google:', error)
            addToast({ description: 'Failed to sign in with Google. Please try again.', color: 'danger' })
        }
    }

    return (
        <Button onPress={handleGoogleSignIn} variant="bordered">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "24px", height: "24px" }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
            <span className="gsi-material-button-contents">Continue with Google</span>
        </Button>
    )
}

// Shared inner component for verification code form
function VerificationCodeForm({
    contact,
    verificationCode,
    onCodeChange,
    onSubmit,
    onResend,
    onCancel,
    isLoading,
    isDisabled,
    codeMaxLength,
    codePlaceholder,
    lockoutAlert
}: {
    contact: string
    verificationCode: string
    onCodeChange: (code: string) => void
    onSubmit: (event: React.FormEvent) => void
    onResend: () => void
    onCancel: () => void
    isLoading: boolean
    isDisabled: boolean
    codeMaxLength?: number
    codePlaceholder: string
    lockoutAlert?: React.ReactNode
}) {
    const formRef = useRef<HTMLFormElement>(null)
    const lastAutoSubmittedCodeRef = useRef<string | null>(null)

    useEffect(() => {
        if (!codeMaxLength || isDisabled || isLoading) return

        if (verificationCode.length !== codeMaxLength) {
            lastAutoSubmittedCodeRef.current = null
            return
        }

        if (lastAutoSubmittedCodeRef.current === verificationCode) return
        lastAutoSubmittedCodeRef.current = verificationCode
        formRef.current?.requestSubmit()
    }, [verificationCode, codeMaxLength, isDisabled, isLoading])

    return (
        <>
            <Alert color="default">
                A verification code has been sent to {contact}.
            </Alert>

            <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
                <Input
                    type="text"
                    inputMode="numeric"
                    description={codePlaceholder}
                    classNames={{
                        input: "font-mono tracking-wide text-4xl",
                    }}
                    autoComplete="one-time-code"
                    placeholder="------"
                    value={verificationCode}
                    onChange={(e) => onCodeChange(e.target.value)}
                    isDisabled={isDisabled}
                    {...(codeMaxLength ? { maxLength: codeMaxLength } : {})}
                    required
                />
                <Button
                    type="submit"
                    isLoading={isLoading}
                    isDisabled={isDisabled || (codeMaxLength !== undefined && verificationCode.length !== codeMaxLength)}
                >
                    Verify code
                </Button>
            </form>
            <div className="flex gap-2 justify-center">
                <Button
                    variant="light"
                    onPress={onResend}
                    isDisabled={isDisabled}
                >
                    Resend code
                </Button>
                <Button
                    variant="light"
                    onPress={onCancel}
                    isDisabled={isLoading}
                >
                    Cancel
                </Button>
            </div>
            {lockoutAlert}
        </>
    )
}

function PhoneVerificationCodeHandler({ phone, confirmationResult, returnUrl, onResend, onCancel }: {
    phone: string
    confirmationResult: ConfirmationResult | null
    returnUrl: string
    onResend: () => void
    onCancel: () => void
}) {
    const [verificationCode, setVerificationCode] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const router = useRouter()

    const handleVerifyCode = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!confirmationResult) {
            addToast({ description: 'Session expired. Please resend the verification code.', color: 'warning' })
            return
        }
        setIsVerifying(true)
        try {
            const cred = await confirmationResult.confirm(verificationCode)
            const idToken = await cred.user.getIdTokenResult()
            redirectIfHasRoles(idToken, router, returnUrl)
        } catch (error) {
            console.error('Error confirming phone code:', error)
            addToast({ description: 'Invalid verification code. Please try again.', color: 'danger' })
            setVerificationCode('')
        } finally {
            setIsVerifying(false)
        }
    }

    const handleResend = async () => {
        setVerificationCode('')
        onResend()
    }

    const handleCodeChange = (code: string) => {
        setVerificationCode(code.replace(/\D/g, '').slice(0, 6))
    }

    return (
        <VerificationCodeForm
            contact={phone}
            verificationCode={verificationCode}
            onCodeChange={handleCodeChange}
            onSubmit={handleVerifyCode}
            onResend={handleResend}
            onCancel={onCancel}
            isLoading={isVerifying}
            isDisabled={isVerifying}
            codeMaxLength={6}
            codePlaceholder="Enter verification code"
        />
    )
}

function EmailCodeVerificationHandler({ email, returnUrl, onResend, onCancel, lockoutRemainingMs }: {
    email: string
    returnUrl: string
    onResend: () => void
    onCancel: () => void
    lockoutRemainingMs?: number
}) {
    const [verificationCode, setVerificationCode] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [isLockedOut, setIsLockedOut] = useState(false)
    const router = useRouter()
    const auth = getAuth()

    useEffect(() => {
        if (lockoutRemainingMs && lockoutRemainingMs > 0) {
            setIsLockedOut(true)
        }
    }, [lockoutRemainingMs])

    const handleVerifyCode = async (event: React.FormEvent) => {
        event.preventDefault()
        if (isLockedOut || isVerifying) return

        setIsVerifying(true)
        try {
            const result = await verifyEmailSignInCode(email, verificationCode)

            if (!result.success) {
                if (result.lockoutRemainingMs && result.lockoutRemainingMs > 0) {
                    setIsLockedOut(true)
                    addToast({
                        title: 'Account Locked',
                        description: result.error || 'Please try again in 15 minutes.',
                        color: 'danger'
                    })
                } else {
                    addToast({
                        description: result.error || 'Invalid verification code. Please try again.',
                        color: 'danger'
                    })
                }
                setVerificationCode('')
                return
            }

            // Sign in with custom token
            if (!result.customToken) {
                addToast({ description: 'Sign-in failed. Please try again.', color: 'danger' })
                return
            }

            const cred = await signInWithCustomToken(auth, result.customToken)
            const idToken = await cred.user.getIdTokenResult()
            redirectIfHasRoles(idToken, router, returnUrl)
        } catch (error) {
            console.error('Error verifying email code:', error)
            addToast({
                description: error instanceof Error ? error.message : 'Failed to verify code. Please try again.',
                color: 'danger'
            })
            setVerificationCode('')
        } finally {
            setIsVerifying(false)
        }
    }

    const handleResend = async () => {
        if (isLockedOut || isVerifying) return
        setVerificationCode('')
        onResend()
    }

    const handleCodeChange = (code: string) => {
        setVerificationCode(code.replace(/\D/g, '').slice(0, 6))
    }

    const lockoutAlert = isLockedOut && lockoutRemainingMs ? (
        <Alert color="warning">
            Too many attempts. Please try again in {Math.ceil(lockoutRemainingMs / 60000)} minutes.
        </Alert>
    ) : undefined

    return (
        <VerificationCodeForm
            contact={email}
            verificationCode={verificationCode}
            onCodeChange={handleCodeChange}
            onSubmit={handleVerifyCode}
            onResend={handleResend}
            onCancel={onCancel}
            isLoading={isVerifying}
            isDisabled={isLockedOut || isVerifying}
            codeMaxLength={6}
            codePlaceholder="Enter 6 digit code"
            lockoutAlert={lockoutAlert}
        />
    )
}

function SignInWithCredentials({ returnUrl, onAwaitingCodeChange }: {
    returnUrl: string
    onAwaitingCodeChange: (awaitingCode: boolean) => void
}) {
    const [input, setInput] = useState('')
    const [password, setPassword] = useState('')
    const [isPhone, setIsPhone] = useState(false)
    const [awaitingEmail, setAwaitingEmail] = useState(false)
    const [awaitingCode, setAwaitingCode] = useState(false)
    const [awaitingEmailCode, setAwaitingEmailCode] = useState(false)
    const [emailCodeLockoutRemainingMs, setEmailCodeLockoutRemainingMs] = useState<number | undefined>()
    const [membershipHelpOpen, setMembershipHelpOpen] = useState(false)
    const [membershipHelpError, setMembershipHelpError] = useState<string | undefined>()
    const [validationErrors, setValidationErrors] = useState<FormProps['validationErrors']>({})
    const confirmationResultRef = useRef<ConfirmationResult | null>(null)
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)
    const recaptchaContainerRef = useRef<HTMLDivElement>(null)
    const auth = getAuth()
    const router = useRouter()
    const emailCodeEnabled = getEmailCodeSignInEnabled()

    function looksLikePhone(value: string): boolean {
        if (!phoneEnabled) return false
        const digits = value.replace(/\D/g, '')
        return /^\+?[\d\s\-().]{7,}$/.test(value.trim()) && digits.length >= 7
    }

    function formatE164PhoneNumber(phoneNumber: string): string {
        return phoneNumber.replace(/^(t:)?(0|\+?44)?/g, '+44').replace(/[^\d+]/g, '')
    }

    const sendPhoneCode = async (phone: string) => {
        if (recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current.clear()
        }
        const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current!, {
            size: 'invisible'
        })
        recaptchaVerifierRef.current = verifier
        const result = await signInWithPhoneNumber(auth, phone, verifier)
        confirmationResultRef.current = result
    }

    const handlePhoneSignIn = async () => {
        const noMembershipError = 'No membership is associated with that phone number. Check your details.'
        try {
            const number = formatE164PhoneNumber(input.trim())
            const { exists } = await checkPhoneNumberExists(number)
            if (!exists) {
                setMembershipHelpError(noMembershipError)
                return
            }
            setMembershipHelpError(undefined)
            await sendPhoneCode(number)
            setAwaitingCode(true)
            onAwaitingCodeChange(true)
        } catch (error) {
            console.error('Error sending SMS:', error)
            addToast({ description: 'Failed to send verification code. Please try again.', color: 'danger' })
        }
    }

    const handleEmailSignInViaCode = async () => {
        const noMembershipError = 'No membership is associated with that email address.'
        const email = input.toLowerCase().trim()

        try {
            const result = await sendEmailSignInCode(email)

            if (!result.success) {
                if (result.nextResendAt) {
                    const now = Date.now()
                    setEmailCodeLockoutRemainingMs(Math.max(0, result.nextResendAt - now))
                }
                if (result.error === noMembershipError) {
                    setMembershipHelpError(result.error)
                    return
                }
                setMembershipHelpError(undefined)
                addToast({
                    description: result.error || 'Failed to send verification code.',
                    color: 'danger'
                })
                return
            }

            setMembershipHelpError(undefined)
            setAwaitingEmailCode(true)
            addToast({
                title: 'Code sent',
                description: `Verification code sent to ${email}`,
                color: 'success'
            })
        } catch (error) {
            console.error('Error sending email code:', error)
            addToast({
                description: 'Failed to send verification code. Please try again.',
                color: 'danger'
            })
        }
    }

    const handleEmailSignIn = async () => {
        const email = input

        // Use email code flow if enabled
        if (emailCodeEnabled && !isPhone) {
            await handleEmailSignInViaCode()
            return
        }

        // Otherwise use existing email-link flow
        if (process.env.NODE_ENV === 'development' && password) {
            try {
                const cred = await signInWithEmailAndPassword(auth, email, password)
                const idToken = await cred.user.getIdTokenResult()
                redirectIfHasRoles(idToken, router, returnUrl)
            } catch {
                addToast({ description: 'Failed to sign in. Please try again.', color: 'danger' })
            }
            return
        }
        const actionCodeSettings = {
            url: `${window.location.origin}/user${returnUrl !== '/' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`,
            handleCodeInApp: true,
        }
        await sendSignInLinkToEmail(auth, email, actionCodeSettings)
        window.localStorage.setItem('emailForSignIn', email)
        setAwaitingEmail(true)
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        if (isPhone) {
            await handlePhoneSignIn()
        } else {
            await handleEmailSignIn()
        }
    }

    const handleResendCode = async () => {
        try {
            await sendPhoneCode(input)
            addToast({ description: 'Verification code resent.', color: 'success' })
        } catch (error) {
            console.error('Error resending SMS:', error)
            addToast({ description: 'Failed to resend verification code. Please try again.', color: 'danger' })
        }
    }

    const handleResendEmailCode = async () => {
        await handleEmailSignInViaCode()
    }

    const handleCancelEmailCode = () => {
        setAwaitingEmailCode(false)
        setEmailCodeLockoutRemainingMs(undefined)
        setMembershipHelpError(undefined)
        setInput('')
        setValidationErrors({})
    }

    const handleCancelPhone = () => {
        confirmationResultRef.current = null
        setAwaitingCode(false)
        onAwaitingCodeChange(false)
        setIsPhone(false)
        setInput('')
    }

    if (awaitingEmail) {
        return (
            <Alert color="default">
                A sign-in link has been sent to your email address. Please check your inbox.
            </Alert>
        )
    }

    if (awaitingEmailCode) {
        return (
            <EmailCodeVerificationHandler
                email={input}
                returnUrl={returnUrl}
                onResend={handleResendEmailCode}
                onCancel={handleCancelEmailCode}
                lockoutRemainingMs={emailCodeLockoutRemainingMs}
            />
        )
    }

    return (
        <>
            <div ref={recaptchaContainerRef} />
            {awaitingCode ? (
                <PhoneVerificationCodeHandler
                    phone={input}
                    confirmationResult={confirmationResultRef.current}
                    returnUrl={returnUrl}
                    onResend={handleResendCode}
                    onCancel={handleCancelPhone}
                />
            ) : (
                <Form onSubmit={handleSubmit} className="flex flex-col gap-4" validationErrors={validationErrors}>
                    <Input
                            type="text"
                            name="contact"
                            placeholder={phoneEnabled ? 'Enter your email address or phone number' : 'Enter your email address'}
                            value={input}
                            onBlur={() => isPhone ? setInput(formatE164PhoneNumber(input)) : setInput(input.trim())}
                            onChange={(e) => {
                                setInput(e.target.value)
                                setIsPhone(looksLikePhone(e.target.value))
                                setMembershipHelpError(undefined)
                            }}
                            required
                        />
                        {membershipHelpError && (
                            <Alert color="danger">
                                <div className="flex items-center justify-between gap-3">
                                    <span>{membershipHelpError}</span>
                                    <MembershipHelp
                                        showInlineAlert={false}
                                        open={membershipHelpOpen}
                                        onOpenChange={setMembershipHelpOpen}
                                    />
                                </div>
                            </Alert>
                        )}
                        {process.env.NODE_ENV === 'development' && !isPhone && (
                            <Input
                                type="password"
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        )}
                        <Button type="submit">
                        {isPhone ? 'Send verification code' : 'Sign in with email'}
                    </Button>
                </Form>
            )}
        </>
    )
}

// ---- Main component ----

export default function SignInContent() {
    const [wrongBrowser, setWrongBrowser] = useState(false)
    const [awaitingCode, setAwaitingCode] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const returnUrl = searchParams.get('returnUrl') || '/'
    const { roles } = useRoles()

    useEffect(() => {
        const auth = getAuth()
        if (auth.currentUser && !wrongBrowser && roles.length > 0) {
            router.push(returnUrl)
        }
    }, [roles, wrongBrowser, returnUrl, router])

    return (
        <>
            <h1 className="mt-8">Sign In</h1>

            <LinkHandler returnUrl={returnUrl} onWrongBrowser={() => setWrongBrowser(true)} />

            {!wrongBrowser && (
                <div className="flex flex-col gap-4 items-stretch w-full max-w-md text-center mx-auto">
                    {!awaitingCode && (
                        <>
                            <p>Please sign in to continue. If you are not a member, please contact the club administrator.</p>
                            <Alert color="warning">
                                You must sign in with the same email address or phone number you have registered with the club.
                            </Alert>
                            <SignInWithGoogle returnUrl={returnUrl} />
                            or
                        </>
                    )}
                    <SignInWithCredentials returnUrl={returnUrl} onAwaitingCodeChange={setAwaitingCode} />
                </div>
            )}
        </>
    )
}