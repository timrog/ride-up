'use client'

import { db } from '@/lib/firebase/initFirebase'
import { addDoc, collection, onSnapshot, Timestamp } from 'firebase/firestore'
import { getAuth } from "firebase/auth"
import React, { FormEvent, useEffect, useState } from 'react'
import { Card } from 'react-bootstrap'
import { EventMessage, Signup, Comment } from 'app/types'

export default function Messages({ id }: { id: string }) {
    const [signups, setSignups] = useState<Signup[]>([])
    const [comments, setComments] = useState<Comment[]>([])
    const [comment, setComment] = useState("")
    const messageDbCollection = collection(db, 'events', id, 'messages')

    async function submitComment(e: FormEvent) {
        e.preventDefault()
        await addDoc(messageDbCollection, {
            type: 'c',
            userId: getAuth().currentUser.uid,
            name: getAuth().currentUser.displayName,
            text: comment,
            createdAt: Timestamp.now()
        })

        setComment('')
    }

    useEffect(() => {
        return onSnapshot(messageDbCollection,
            (snapshot) => {
                const messages = snapshot.docs.map(doc => doc.data()) as EventMessage[]
                console.log(messages)
                setSignups(messages.filter(m => m.type == 's'))
                setComments(messages.filter(m => m.type == 'c'))
            })
    }, [id])

    return <>
        <h2>{signups.length} {signups.length == 1 ? 'sign-up' : 'sign-ups'}</h2>
        <ul>
            {signups.map(signup => <li key={signup.userId}>{signup.name}</li>)}
        </ul>

        {comments.map(c => <Card key={c.createdAt.toString()}>
            <Card.Body>
                <Card.Title>{c.name}</Card.Title>
                <Card.Text>{c.text}</Card.Text>
            </Card.Body>
        </Card>)}

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

