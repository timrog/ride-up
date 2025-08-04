'use client'
import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Input } from "@heroui/react"
import { signInWithGoogle } from "@/lib/firebase/auth"
import { getAuth, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink } from "firebase/auth"
import router from "next/router"

const SignInPage = () => {
    const [email, setEmail] = useState('')
    const [awaitingEmail, setAwaitingEmail] = useState(false)
    const auth = getAuth()

    useEffect(() => {
        if (isSignInWithEmailLink(auth, window.location.href)) {
            let email = window.localStorage.getItem('emailForSignIn')
            if (email) {
                signInWithEmailLink(auth, email, window.location.href)
                    .then(() => window.location.href = '/')
                    .catch((error) => {
                        console.error('Error signing in with email link:', error)
                        alert('Failed to sign in. Please try again.')
                    })
            }
        }
    }, [1])

    const handleEmailSignIn = async (event: React.FormEvent) => {
        event.preventDefault()

        const actionCodeSettings = {
            url: "https://localhost:3000/user",
            handleCodeInApp: true,
        }
        await sendSignInLinkToEmail(auth, email, actionCodeSettings)
        window.localStorage.setItem('emailForSignIn', email)
        setAwaitingEmail(true)
    }

    return <>
        <h1>
            Sign In
        </h1>
        {
            awaitingEmail && (
                <Alert color="default">
                    A sign-in link has been sent to your email address. Please check your inbox.
                </Alert>
            )
        }
        {
            !awaitingEmail &&
            <div className="flex flex-col gap-4 items-stretch w-full max-w-md text-center mx-auto">
                <p>Please sign in to continue. If you are not a member, please contact the club administrator.</p>
                <Alert color="warning">
                    You must sign in with the same email address you have registered with the club.
                </Alert>

                <Button onPress={signInWithGoogle} variant="bordered">
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
                    <Button type="submit">
                        Sign in with email
                    </Button>
                </form>
            </div>
        }
    </>
}

export default SignInPage
