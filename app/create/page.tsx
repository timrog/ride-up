import { redirect } from 'next/navigation'
import { getUser } from "app/serverAuth"
import CreateEventClient from "./CreateEventClient"
import { Alert } from "@heroui/alert"

export default async function CreateEvent() {
    const { roles } = await getUser()

    if (!roles.includes('member')) 
        redirect('/user?returnUrl=/create')

    else if (!roles.includes('leader')) {
        return (
            <div className="container px-4 sm:mx-auto my-16">
                <h1>Want to post a ride?</h1>
                <Alert color="warning">
                    We welcome everyone to post rides. There are just a few steps to go through.
                    <a href={`https://wa.me/${process.env.CONTACT_RIDECOORD}`}>Contact the Ride Coordinator to get set up.</a>
                </Alert>
            </div>
        )
    }

    return (
        <div className="container px-4 sm:mx-auto my-16">
            <h1>Post a ride</h1>
            <CreateEventClient />
        </div>
    )
}
