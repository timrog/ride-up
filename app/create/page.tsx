'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRoles } from 'app/clientAuth'
import CreateEvent from "./CreateEventClient"
import { Alert } from "@heroui/alert"
import { Spinner } from "@heroui/react"

export default function CreateEvent() {
    const { roles, currentUser } = useRoles()
    const router = useRouter()

    useEffect(() => {
        if (currentUser === null) {
            router.push('/user?returnUrl=/create')
        }
    }, [currentUser, router])

    if (currentUser === null) {
        return <div className="flex justify-center my-16"><Spinner size="lg" /></div>
    }

    if (!roles.includes('leader')) {
        return (
            <div className="container px-4 sm:mx-auto my-16">
                <h1>Want to post a ride?</h1>
                <Alert color="warning">
                    We welcome everyone to post rides. There are just a few steps to go through.
                    <a href={`https://wa.me/${process.env.NEXT_PUBLIC_CONTACT_RIDECOORD}`}>Contact the Ride Coordinator to get set up.</a>
                </Alert>
            </div>
        )
    }

    return (
        <div className="container px-4 sm:mx-auto my-16">
            <h1>Post a ride</h1>
            <CreateEvent />
        </div>
    )
}
