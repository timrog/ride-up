'use client'

import { db } from '@/lib/firebase/initFirebase'
import { deleteField, doc, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { getAuth } from "firebase/auth"
import React, { useState } from 'react'
import { Button } from "@heroui/react"

export default function SignupButton({ id, active }: { id: string, active: boolean }) {
    const activityDoc = doc(db, 'events', id, 'activity', 'private')
    const user = getAuth().currentUser
    if (!user) return null

    const addSignup = async () => {
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
    }

    const clearSignup = async () => {
        await updateDoc(activityDoc, {
            [`signups.${user.uid}`]: deleteField()
        })
    }

    return active ? (
        <Button onPress={clearSignup} color="warning">Cancel my sign-up</Button>
    ) : (
        <Button onPress={addSignup} color="primary">Sign me up</Button>
    )
}

