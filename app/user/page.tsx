'use client'
import { Suspense } from 'react'
import { Spinner } from "@heroui/react"
import SignInContent from './SignInContent'
import { useRoles } from "app/clientAuth"
import UserProfile from "./UserProfile"

function SignInFallback() {
    return (
        <div className="flex justify-center items-center min-h-[200px]">
            <Spinner size="lg" />
        </div>
    )
}

export default function UserPage() {
    const { currentUser } = useRoles()
    return (
        <div className="container mx-auto px-4">
            <Suspense fallback={<SignInFallback />}>
                {currentUser ? <UserProfile /> : <SignInContent />}
            </Suspense></div>
    )
}
