'use client'
import React, { useState } from 'react'
import { addToast, Button, Input, toast } from "@heroui/react"
import { getAuth, updateProfile } from "firebase/auth"
import { useRoles } from "app/clientAuth"

export default function UserProfile() {
    const auth = getAuth()
    const { currentUser } = useRoles()
    const [displayName, setDisplayName] = useState(currentUser?.displayName || '')
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (!auth.currentUser) return

        setIsSaving(true)

        try {
            await updateProfile(auth.currentUser, { displayName })
            addToast({ description: 'Name updated successfully' })
        } catch (error) {
            addToast({ description: 'Failed to update name' })
        } finally {
            setIsSaving(false)
        }
    }

    if (!currentUser) {
        return <p>Please sign in to view your profile.</p>
    }

    return (
        <div className="max-w-md">
            <h2 className="text-xl font-bold mb-4">Your profile</h2>

            <div className="mb-4">
                <Input
                    label="Display Name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                />
            </div>

            <div className="mb-4">
                <Input
                    label="Email"
                    value={currentUser.email || ''}
                    isReadOnly
                    isDisabled
                />
            </div>

            <Button
                onPress={handleSave}
                isLoading={isSaving}
                color="primary"
            >
                Save
            </Button>
        </div>
    )
}