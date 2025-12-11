import { redirect } from 'next/navigation'
import { getUser } from "app/serverAuth"
import CreateEventClient from "./CreateEventClient"

export default async function CreateEvent() {
    const { roles } = await getUser()

    if (!roles.includes('leader')) {
        redirect('/user?returnUrl=/create')
    }

    return (
        <div className="container px-4 sm:mx-auto my-16">
            <h1>Post a ride</h1>
            <CreateEventClient />
        </div>
    )
}
