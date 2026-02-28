'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRoles } from 'app/clientAuth'
import CreateEventClient from "./CreateEvent"
import { Alert } from "@heroui/alert"
import { Spinner } from "@heroui/react"
import { getContactInfo } from "app/serverActions"

export default function CreateEvent() {
    const { roles, currentUser } = useRoles()
    const router = useRouter()
    const [rideCoord, setRideCoord] = useState<string | null>(null)

    useEffect(() => {
        if (currentUser === null) {
            router.push('/user?returnUrl=/create')
        }
    }, [currentUser, router])

    useEffect(() => {
        const loadRideCoord = async () => {
            try {
                const info = await getContactInfo()
                setRideCoord(info.rideCoordinator)
            } catch (error) {
                console.error('Failed to load contact info:', error)
            }
        }
        loadRideCoord()
    }, [])

    if (currentUser === null) {
        return <div className="flex justify-center my-16"><Spinner size="lg" /></div>
    }

    if (!roles.includes('leader')) {
        return (
            <div className="container px-4">
                <h1>Want to post a ride?</h1>
                <Alert color="warning">
                    We welcome everyone to post rides. There are just a few steps to go through.
                    {rideCoord && <a href={`https://wa.me/${rideCoord}`}>Contact the Ride Coordinator to get set up.</a>}
                </Alert>
            </div>
        )
    }

    return (
        <div className="container px-4">
            <h1>Post a ride</h1>
            <CreateEventClient />
        </div>
    )
}
