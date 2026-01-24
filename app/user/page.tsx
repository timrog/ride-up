'use client'
import { Suspense } from 'react'
import { Spinner } from "@heroui/react"
import SignInContent from './SignInContent'
import { useRoles } from "app/clientAuth"
import UserProfile from "./UserProfile"
import { redirect, useRouter, useSearchParams } from "next/navigation"

function SignInFallback() {
    return (
        <div className="flex justify-center items-center min-h-[200px]">
            <Spinner size="lg" />
        </div>
    )
}

export default function UserPage() {
    const { currentUser } = useRoles()
    const searchParams = useSearchParams()
    const router = useRouter()
    const returnUrl = searchParams.get('returnUrl')
    if (currentUser && returnUrl) {
        window.location.href = returnUrl
        return null
    }

    return (
        <div className="container mx-auto px-4">
            <Suspense fallback={<SignInFallback />}>
                {currentUser ? <UserProfile /> : <SignInContent />}
            </Suspense></div>
    )
}
