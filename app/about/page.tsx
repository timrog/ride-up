import { IconLine } from "@/components/IconLine"
import ChevronLeftIcon from "@heroicons/react/24/outline/ChevronLeftIcon"
import WithAuth from "app/withAuthServer"
import Link from "next/link"
import FeedbackForm from "./FeedbackForm"

export default async () => {
    const email = process.env.CONTACT_EMAIL
    const whatsapp = process.env.CONTACT_WHATSAPP

    return (
        <div className="container px-4 sm:mx-auto my-16">
            <Link href="/"><IconLine icon={ChevronLeftIcon}>Back to calendar</IconLine></Link>
            <h1>Problems? Questions?</h1>

            <div className="max-w-2xl sm:mx-auto">
                <p>
                    <WithAuth role="member">
                        <a href={`mailto:${email}`}>Send an email</a> or <a href={`https://wa.me/${whatsapp}`}>WhatsApp</a>.
                    </WithAuth>
                    <WithAuth except role="member">
                        <a href={`mailto:chair@vcgh.co.uk`}>Send an email</a> and we'll get on to it.
                    </WithAuth>
                </p>
                <p><a href="https://github.com/timrog/ride-up">Source on Github (help us improve!)</a></p>
                <p><a href="https://github.com/timrog/ride-up/issues/new">Report a technical issue</a></p>
            </div>

            <WithAuth>
                <h1 className="mt-8">Send feedback or suggestions</h1>

                <FeedbackForm />
            </WithAuth>

        </div>
    )
}