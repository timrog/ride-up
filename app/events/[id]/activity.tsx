'use client'

import { db } from '@/lib/firebase/initFirebase'
import { arrayUnion, doc, onSnapshot, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { getAuth } from "firebase/auth"
import React, { KeyboardEvent, useEffect, useState } from 'react'
import { Comment, EventActivity } from 'app/types'
import SignupButton from "./signUpButton"
import { Button, Card, CardBody, CardHeader, Textarea } from "@heroui/react"
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { useRoles } from "app/clientAuth"

export default function Comments({ id }: { id: string }) {
    const newActivity = { signups: {}, comments: [] }
    const [activity, setActivity] = useState<EventActivity>(newActivity)
    const [comment, setComment] = useState("")
    const [commentBusy, setCommentBusy] = useState(false)
    const activityDoc = doc(db, 'events', id, 'activity', 'private')
    const currentUser = getAuth().currentUser

    async function submitComment(e: Event) {
        if (!currentUser) return console.error("No user signed in")
        e.preventDefault()
        if (commentBusy) return
        setCommentBusy(true)
        const commentRecord: Comment = {
            createdAt: Timestamp.now(),
            name: currentUser.displayName || "Anonymous",
            userId: currentUser.uid,
            text: comment
        }

        if (activity == newActivity)
            await setDoc(activityDoc, { ...newActivity, comments: [commentRecord] })
        else
            await updateDoc(activityDoc, { comments: arrayUnion(commentRecord) })

        setComment('')
        setCommentBusy(false)
    }

    const { roles } = useRoles()
    useEffect(() => {
        let snapshotUnsubscribe: (() => void) | null = null

        const authUnsubscribe = getAuth().onIdTokenChanged(async (user) => {
            if (user) {
                try {
                    await user.getIdToken(true)

                    snapshotUnsubscribe = onSnapshot(activityDoc,
                        (snapshot) => {
                            if (snapshot.data()) {
                                setActivity(snapshot.data() as EventActivity)
                            }
                        },
                        (error) => {
                            console.error('Firestore snapshot error:', error)
                        }
                    )
                } catch (error) {
                    console.error('Token refresh failed:', error)
                }
            } else {
                if (snapshotUnsubscribe) {
                    snapshotUnsubscribe()
                }
            }
        })

        return () => {
            authUnsubscribe()
            snapshotUnsubscribe?.()
        }
    }, [id])

    const signupCount = Object.keys(activity.signups).length

    const userId = getAuth().currentUser?.uid
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

    return <>
        <h2>{signupCount} {signupCount == 1 ? 'sign-up' : 'sign-ups'}</h2>

        {roles.includes("member") &&
            <ul className="text-lg">
                {Object.entries(activity.signups).map(([userId, signup]) => <li key={userId}>{signup.name}</li>)}
            </ul>}

        <div className="my-3">

            {roles.includes("member") ?
                <SignupButton id={id} active={hasActiveSignup} /> :
                <div className="alert alert-warning">Please sign in to sign up for this event.</div>
            }
        </div>

        <h2>Comments</h2>
        <div>
            {activity.comments?.map(c => (
                <Card className={`mb-3 ${c.userId === currentUser?.uid ? 'bg-blue-200 ml-16' : 'bg-white mr-16'}`} key={c.createdAt.toString()}>
                    <CardHeader className="text-sm">{c.name} &middot; {formatRelative(c.createdAt.toDate())}</CardHeader>
                    <CardBody className="whitespace-pre-line">{c.text}</CardBody >
                </Card >
            ))
            }
        </div >

        <div className="flex items-end gap-2 mb-4 border border-gray-300 rounded-lg bg-gray-50">
            <Textarea
                min={1} minRows={1}
                type="text"
                size="lg"
                placeholder="Type a message"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && !e.shiftKey && submitComment(e)}
            />
            <Button isIconOnly radius="lg" className="p-2" color="primary" onPress={e => submitComment(e)}><PaperAirplaneIcon /></Button>
        </div>
    </>
}

