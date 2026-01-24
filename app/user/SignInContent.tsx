'use client'
import React, { useEffect, useState } from 'react'
import { addToast, Alert, Button, Input } from "@heroui/react"
import { signInWithGoogle } from "@/lib/firebase/auth"
import { getAuth, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailAndPassword, signInWithEmailLink } from "firebase/auth"
import { useRouter, useSearchParams } from "next/navigation"
import { setCookie } from "cookies-next/client"

export default function SignInContent() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [awaitingEmail, setAwaitingEmail] = useState(false)
    const [wrongBrowser, setWrongBrowser] = useState(false)
    const auth = getAuth()
    const router = useRouter()
    const searchParams = useSearchParams()
    const returnUrl = searchParams.get('returnUrl') || '/'

    useEffect(() => {
        if (isSignInWithEmailLink(auth, window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn')
            if (email) {
                signInWithEmailLink(auth, email, window.location.href)
                    .then(cred => {
                        cred.user.getIdTokenResult().then(idToken => {

                            window.localStorage.removeItem('emailForSignIn')
                            router.push(returnUrl)
                        })
                    })
                    .catch((error) => {
                        console.error('Error signing in with email link:', error)
                        alert('Failed to sign in. Please try again.')
                    })
            } else {
                setWrongBrowser(true)
            }
        }

        if (auth.currentUser && !wrongBrowser) {
            router.push(returnUrl)
        }
    }, [returnUrl, router, auth])

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle()
            router.push(returnUrl)
        } catch (error) {
            console.error('Error signing in with Google:', error)
            alert('Failed to sign in with Google. Please try again.')
        }
    }

    const handleEmailSignIn = async (event: React.FormEvent) => {
        event.preventDefault()

        if (process.env.NODE_ENV === 'development' && password) {
            try {
                await signInWithEmailAndPassword(auth, email, password)
                router.push(returnUrl)
            }
            catch {
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

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            addToast({ description: 'Link copied to clipboard!', color: 'success' })
        } catch (error) {
            console.error('Failed to copy link:', error)
            addToast({ description: 'Failed to copy link', color: 'danger' })
        }
    }

    return (
        <>
            <h1 className="mt-8">
                Sign In
            </h1>
            {
                wrongBrowser && (
                    <Alert color="warning" title="Sign in link opened in wrong browser">
                        <div className="flex flex-col gap-3">
                            <p>This sign-in link has opened in a different browser to the one where you requested it. To complete your sign-in:</p>
                            <ol className="list-decimal list-inside space-y-2">
                                <li>Click the button below to copy the link</li>
                                <li>Switch to the original tab where you requested the sign-in link</li>
                                <li>Paste the link into the address bar and press Enter</li>
                            </ol>
                            <Button
                                color="warning"
                                variant="flat"
                                onPress={handleCopyLink}
                                className="w-full"
                            >
                                Copy link to clipboard
                            </Button>
                        </div>
                    </Alert>
                )
            }
            {
                awaitingEmail && !wrongBrowser && (
                    <Alert color="default">
                        A sign-in link has been sent to your email address. Please check your inbox.
                    </Alert>
                )
            }
            {
                !awaitingEmail && !wrongBrowser &&
                <div className="flex flex-col gap-4 items-stretch w-full max-w-md text-center mx-auto">
                    <p>Please sign in to continue. If you are not a member, please contact the club administrator.</p>
                    <Alert color="warning">
                        You must sign in with the same email address you have registered with the club.
                    </Alert>

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
                    or
                    <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
                        <Input
                            type="email"
                            name="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                            {process.env.NODE_ENV === 'development' && (
                            <Input
                                type="password"
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />)}
                        <Button type="submit">
                            Sign in with email</Button>
                    </form>
                </div>
            }
        </>
    )
}