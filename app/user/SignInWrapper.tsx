'use client'
import { Suspense } from 'react'
import { Spinner } from "@heroui/react"
import SignInContent from './SignInContent'

function SignInFallback() {
    return (
        <div className="flex justify-center items-center min-h-[200px]">
            <Spinner size="lg" />
        </div>
    )
}

export default function SignInPage() {
    return (
        <Suspense fallback={<SignInFallback />}>
            <SignInContent />
        </Suspense>
    )
}