'use client'

import { db } from '@/lib/firebase/initFirebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { getAuth } from "firebase/auth"
import React, { KeyboardEvent, useEffect, useState } from 'react'
import { EventActivity } from 'app/types'
import SignupButton from "./signUpButton"
import { Avatar, Button, Card, CardBody, CardHeader, PressEvent, Textarea } from "@heroui/react"
import { PaperAirplaneIcon, UserIcon } from '@heroicons/react/24/outline'
import { IconLine } from "@/components/IconLine"
import { addComment } from "app/serverActions"
import WithAuth from "app/withAuthClient"
import Link from "next/link"

export default function Activity({ id, isActive }: { id: string, isActive: boolean }) {
    const newActivity = { signups: {}, comments: [] }
    const [activity, setActivity] = useState<EventActivity>(newActivity)
    const [comment, setComment] = useState("")
    const [commentBusy, setCommentBusy] = useState(false)
    const activityDoc = doc(db, 'events', id, 'activity', 'private')
    const currentUser = getAuth().currentUser

    async function submitComment(e: React.FormEvent | PressEvent) {
        if (!currentUser) return console.error("No user signed in")
        if ('preventDefault' in e) e.preventDefault()
        if (commentBusy) return
        setCommentBusy(true)

        try {
            const result = await addComment(id, comment)
            if (result.success) {
                setComment('')
            } else {
                console.error('Failed to add comment:', result.error)
            }
        } catch (error) {
            console.error('Error submitting comment:', error)
        } finally {
            setCommentBusy(false)
        }
    }

    useEffect(() => {
        return onSnapshot(activityDoc,
            (snapshot) => {
                if (snapshot.data()) {
                    setActivity(snapshot.data() as EventActivity)
                }
            },
            (error) => {
                console.error('Firestore snapshot error:', error)
            }
        )
    }, [id])

    const signupCount = Object.keys(activity.signups).length
    const userId = currentUser?.uid
    const hasActiveSignup = !!(userId && activity.signups[userId])

    function formatRelative(date: Date): string {
        const now = new Date()
        const isToday = date > new Date(now.getFullYear(), now.getMonth(), now.getDate())

        if (isToday) {
            return date.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            })
        }

        const diffMs = now.getTime() - date.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays === 1) return 'yesterday'
        if (diffDays < 7) return `${diffDays} days ago`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
        return date.toLocaleDateString()
    }

    return <div className="md:grid md:grid-cols-2 md:gap-8"
        style={{ gridTemplateColumns: '1fr 2fr' }}>

        <div>
            <h2>{signupCount} {signupCount == 1 ? 'sign-up' : 'sign-ups'}</h2>

            <WithAuth role="member">
                <ul className="text-lg">
                    {Object.entries(activity.signups).map(([userId, signup]) =>
                        <li className="flex gap-2 items-center">
                            <Avatar src={signup.avatarUrl || undefined} />
                            {signup.name}
                            {signup.phone &&
                                <Link href={`https://wa.me/${signup.phone.replace(/\D/g, '')}`} target="_blank">
                                    <img src="/whatsapp.png" alt="WhatsApp" title={signup.phone} width={24} />
                                </Link>}
                        </li>
                    )}
                </ul>
            </WithAuth>

            {isActive && <div className="my-3">
                <SignupButton id={id} active={hasActiveSignup} />
            </div>}
        </div>
        <div>
            <h2>Comments</h2>
            <div>
                {activity.comments?.map(c => (
                    <Card
                        className={`mb-3 ${c.userId === currentUser?.uid ? 'bg-blue-200 ml-16' : 'bg-white mr-16'}`} key={c.createdAt.toString()}>
                        <CardHeader className="font-black flex gap-2">
                            <Avatar src={c.avatarUrl || undefined} />
                            <span>{c.name} &middot; {formatRelative(c.createdAt.toDate())}</span>
                        </CardHeader>
                        <CardBody className="whitespace-pre-line">{c.text}</CardBody >
                    </Card >
                ))
                }
            </div >

            <div className="flex">
                <Textarea
                    classNames={{ input: 'self-center', inputWrapper: 'px-2' }}
                    color="primary"
                    min={1} minRows={1}
                    size="lg"
                    placeholder="Type a message"
                    value={comment}
                    radius="full"
                    onChange={(e) => setComment(e.target.value)}
                    onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && !e.shiftKey && submitComment(e)}
                    startContent={
                        <Avatar src={currentUser?.photoURL || undefined} className="self-start" />
                    }
                    endContent={
                        <Button isIconOnly radius="full" className="p-2 self-end" color="primary" onPress={e => submitComment(e)}><PaperAirplaneIcon /></Button>
                    }
                />

            </div>
        </div>
    </div>
}

