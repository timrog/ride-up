'use client'

import { db } from '@/lib/firebase/initFirebase'
import { arrayUnion, doc, onSnapshot, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { getAuth } from "firebase/auth"
import React, { FormEvent, useEffect, useState } from 'react'
import { Card } from 'react-bootstrap'
import { Comment, EventActivity } from 'app/types'
import SignupButton from "./signUpButton"

export default function Comments({ id }: { id: string }) {
    const newActivity = { signups: {}, comments: [] }
    const [activity, setActivity] = useState<EventActivity>(newActivity)
    const [comment, setComment] = useState("")
    const activityDoc = doc(db, 'events', id, 'activity', 'private')
    const currentUser = getAuth().currentUser

    async function submitComment(e: FormEvent) {
        e.preventDefault()
        const commentRecord: Comment = {
            createdAt: Timestamp.now(),
            name: currentUser.displayName,
            userId: currentUser.uid,
            text: comment
        }
        if (activity == newActivity)
            await setDoc(activityDoc, { ...newActivity, comments: [commentRecord] })
        else
            await updateDoc(activityDoc, { comments: arrayUnion(commentRecord) })
        setComment('')
    }

    useEffect(() => {
        return onSnapshot(activityDoc,
            (snapshot) => {
                if (snapshot.data())
                    setActivity(snapshot.data() as EventActivity)
            }
        )
    }, [id])

    const signupCount = Object.keys(activity.signups).length
    const activeSignup = activity.signups[getAuth().currentUser?.uid]

    return <>
        <h2>{signupCount} {signupCount == 1 ? 'sign-up' : 'sign-ups'}</h2>
        <div className="my-3">
            <SignupButton id={id} active={!!activeSignup} />
        </div>
        <ul>
            {Object.entries(activity.signups).map(([userId, signup]) => <li key={userId}>{signup.name}</li>)}
        </ul>

        <h2>Comments</h2>
        <div className="mt-3">
            {activity.comments?.map(c => (
                <Card bg={c.userId === currentUser?.uid ? 'info' : 'light'}
                    border="0" className={`mb-3 ${c.userId === currentUser?.uid ? 'ms-5' : 'me-5'}`} key={c.createdAt.toString()}>
                    <Card.Body>
                        <Card.Title>{c.name}</Card.Title>
                        <Card.Text>{c.text}</Card.Text>
                    </Card.Body >
                </Card >
            ))
            }
        </div>

        <form onSubmit={submitComment} className="mt-4 input-group">
            <input
                type="text"
                className="form-control"
                placeholder="Type a message"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
            />
        </form>
    </>
}

