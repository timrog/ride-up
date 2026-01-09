'use client'

import { getAuth } from "firebase/auth"
import React, { useState } from 'react'
import { Button, addToast } from "@heroui/react"
import { addSignup, removeSignup } from "app/serverActions"

interface SignupButtonProps {
    eventId: string
    displayName?: string
    signupKey: string
    active: boolean
}

export default function SignupButton({ eventId, displayName, signupKey, active }: SignupButtonProps) {
    const [isLoading, setIsLoading] = useState(false)
    const user = getAuth().currentUser

    if (!user) return null

    const handleAddSignup = async () => {
        setIsLoading(true)
        try {
            const result = await addSignup(eventId, signupKey)
            if (!result.success) {
                addToast({
                    title: "Error",
                    description: "Failed to sign up for this event.",
                    color: "danger"
                })
            }
        } catch (error) {
            addToast({
                title: "Error",
                description: "An unexpected error occurred.",
                color: "danger"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleRemoveSignup = async () => {
        setIsLoading(true)
        try {
            const result = await removeSignup(eventId, signupKey)
            if (!result.success) {
                addToast({
                    title: "Error",
                    description: "Failed to cancel your sign-up.",
                    color: "danger"
                })
            }
        } catch (error) {
            addToast({
                title: "Error",
                description: "An unexpected error occurred.",
                color: "danger"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return active ? (
        <Button onPress={handleRemoveSignup} color="warning" isDisabled={isLoading}>
            {displayName ? `Cancel ${displayName}` : 'Cancel my sign-up'}
        </Button>
    ) : (
        <Button onPress={handleAddSignup} color="primary" isDisabled={isLoading}>
            {displayName ? `Sign up as ${displayName}` : 'Sign me up'}
        </Button>
    )
}
