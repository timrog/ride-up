'use client'

import { db } from '@/lib/firebase/initFirebase'
import { collection, deleteDoc, doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore'
import { getAuth } from "firebase/auth"
import React, { useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import { Signup } from 'app/types'

export default function Comments({ id }: { id: string }) {
    const [list, setList] = useState<Signup[]>([])

    useEffect(() => {
        return onSnapshot(collection(db, 'events', id, 'signups'),
            (snapshot) => {
                const signups = snapshot.docs.map(doc => doc.data()) as Signup[]
                setList(signups)
            })
    }, [id])

    return <>
        <h2>{list.length} {list.length == 1 ? 'sign-up' : 'sign-ups'}</h2>
        <ul>
            {list.map(signup => <li key={signup.userId}>{signup.name}</li>)}
        </ul>
    </>
}

