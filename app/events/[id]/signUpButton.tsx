'use client'

import { db } from '@/lib/firebase/initFirebase'
import { deleteField, doc, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { getAuth } from "firebase/auth"
import React, { useState } from 'react'
import { Button } from "@heroui/react"

export default function SignupButton({ id, active }: { id: string, active: boolean }) {
    const [isActive, setActive] = useState(active)
    const activityDoc = doc(db, 'events', id, 'activity', 'private')

    const addSignup = async () => {
        const user = getAuth().currentUser
        await setDoc(activityDoc,
            {
                signups: {
                    [user.uid]: {
                        name: user.displayName,
                        createdAt: Timestamp.now()
                    }
                }
            }, { merge: true }
        )
        setActive(true)
    }

    const clearSignup = async () => {
        const user = getAuth().currentUser

        await updateDoc(activityDoc, {
            [`signups.${user.uid}`]: deleteField()
        })
        setActive(false)
    }

    return isActive ? (
        <Button onPress={clearSignup}>Cancel my sign-up</Button>
    ) : (
        <Button onPress={addSignup}>Sign me up</Button>
    )
}

