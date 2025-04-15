'use client'

import { db } from '@/lib/firebase/initFirebase'
import { deleteDoc, doc, setDoc, Timestamp } from 'firebase/firestore'
import { getAuth } from "firebase/auth"
import React, { useState } from 'react'
import { Button } from 'react-bootstrap'

export default function SignupButton({ id, active }: { id: string, active: boolean }) {
    const [isActive, setActive] = useState(active)

    const addSignup = async () => {
        const user = getAuth().currentUser
        await setDoc(doc(db, 'events', id, 'messages', user.uid), {
            type: 's',
            userId: user.uid,
            name: user.displayName,
            createdAt: Timestamp.now()
        })
        setActive(true)
    }

    const clearSignup = async () => {
        const user = getAuth().currentUser
        await deleteDoc(doc(db, 'events', id, 'messages', user.uid))
        setActive(false)
    }

    return isActive ? (
        <Button variant="danger" onClick={clearSignup}>Cancel my sign-up</Button>
    ) : (
        <Button variant="primary" onClick={addSignup}>Sign me up</Button>
    )
}

