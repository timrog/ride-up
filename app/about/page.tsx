'use client'
import { IconLine } from "@/components/IconLine"
import ChevronLeftIcon from "@heroicons/react/24/outline/ChevronLeftIcon"
import WithAuth from "app/withAuthClient"
import Link from "next/link"
import { useEffect, useState } from "react"
import FeedbackForm from "./FeedbackForm"
import { getContactInfo } from "app/serverActions"

export default function AboutPage() {
    const [contactInfo, setContactInfo] = useState<{ email: string; whatsapp: string } | null>(null)

    useEffect(() => {
        const loadContactInfo = async () => {
            try {
                const info = await getContactInfo()
                setContactInfo(info)
            } catch (error) {
                console.error('Failed to load contact info:', error)
            }
        }
        loadContactInfo()
    }, [])

    const email = contactInfo?.email
    const whatsapp = contactInfo?.whatsapp

    return (
        <div className="container px-4 sm:mx-auto my-16">
            <div className="max-w-2xl sm:mx-auto">

                <h1>Frequently Asked Questions</h1>
                <h3>When I sign in, the site says I don't have a valid membership, but I do.</h3>
                <p>
                    You must sign in with the exact same email address as the one registered with the club.
                    If you don't know the correct email address, please check your emails as it will be the one you receive club communications from.
                    If you have signed in with Google, check the email address associated with your Google account.
                </p>
                <p>If you've recently joined or renewed in the last few hours, we might not have caught up. Click the Help button for more options in this case.</p>
                <h3>I've signed in, but I can't post a ride</h3>
                <p>Only designated ride leaders can post rides. Please contact the group ride coordinator to get set up. If you think you are a ride leader, then it may be a case of our database being out of kilter.</p>
                <h3>I've signed in, but I can't sign up to a ride</h3>
                <p>You must be a member of the club to sign up to a ride. If you are not a member, please contact the club administrator to get set up. Please check your membership status in MemberMojo.</p>
                <p>For obvious reasons, you can't sign up to rides that have already happened.</p>
                <h3>It says it's sent a link to my email address, but I don't see it</h3>
                <p>These sometimes get filtered into spam folders so check there. In rare cases, your mail server may be completely blocking the email, in which case, please contact us below for options.</p>
                <h3>Not all of the riders signed up have contact details next to their names.</h3>
                <p>A WhatsApp link is shown next to each rider only if they have opted in to the Members Directory in MemberMojo.</p>

            <h1>Problems? Questions?</h1>

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