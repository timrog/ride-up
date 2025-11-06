'use client'

import { getAuth } from "firebase/auth"
import React, { useState } from 'react'
import { Button, addToast } from "@heroui/react"
import { addSignup, removeSignup } from "app/serverActions"

export default function SignupButton({ id, active }: { id: string, active: boolean }) {
    const [isLoading, setIsLoading] = useState(false)
    const user = getAuth().currentUser
    if (!user) return null

    const handleAddSignup = async () => {
        setIsLoading(true)
        try {
            const result = await addSignup(id)
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
            const result = await removeSignup(id)
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
            Cancel my sign-up
        </Button>
    ) : (
        <Button onPress={handleAddSignup} color="primary" isDisabled={isLoading}>
            Sign me up
        </Button>
    )
}

