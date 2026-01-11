'use client'

import { Button, addToast } from "@heroui/react"
import { useState } from 'react'
import { refreshMembership } from "app/refreshMembership"

export default function RefreshMembershipButton() {
    const [isLoading, setIsLoading] = useState(false)

    const handleRefresh = async () => {
        setIsLoading(true)
        try {
            const result = await refreshMembership()
            if (result.success) {
                addToast({
                    title: "Success",
                    description: "Membership refresh triggered successfully.",
                    color: "success"
                })
            } else {
                addToast({
                    title: "Error",
                    description: result.error || "Failed to trigger membership refresh.",
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

    return (
        <Button 
            onPress={handleRefresh} 
            color="primary" 
            isLoading={isLoading}
        >
            Refresh Membership
        </Button>
    )
}
