'use client'

import { Button, Textarea, addToast, Card, CardBody, CardHeader, CardFooter } from "@heroui/react"
import { useEffect, useState } from "react"
import { addDoc, collection, Timestamp, query, orderBy, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase/initFirebase"
import { useRoles } from "app/clientAuth"
import WithAuth from "app/withAuthClient"
import { toFormattedDate, toFormattedTime } from "app/format"

interface FeedbackItem {
    id: string
    text: string
    userId: string | null
    userName: string
    userEmail: string | null
    createdAt: Timestamp
}

function FeedbackList() {
    const { roles } = useRoles()
    const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!roles?.includes('admin')) {
            setLoading(false)
            return
        }

        const q = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'))
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as FeedbackItem))
            setFeedbackItems(items)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [roles])

    if (!roles?.includes('admin')) {
        return null
    }

    if (loading) {
        return <div className="mt-8">Loading feedback...</div>
    }

    return (
        <div className="mt-8 max-w-2xl sm:mx-auto">
            <h2 className="text-lg font-bold mb-4">Submitted Feedback ({feedbackItems.length})</h2>
            <div className="space-y-4 sm:mx-auto">
                {feedbackItems.map(item => (
                    <Card key={item.id}>
                        <CardHeader>
                            <strong>{item.userName}</strong>
                            {item.userEmail && <span className="text-sm text-gray-500 ml-2">({item.userEmail})</span>}
                        </CardHeader>
                        <CardBody>
                            <p className="whitespace-pre-wrap">{item.text}</p>
                        </CardBody>
                        <CardFooter>
                            {toFormattedDate(item.createdAt.toDate())} {toFormattedTime(item.createdAt.toDate())}
                        </CardFooter>
                    </Card>
                ))}
                {feedbackItems.length === 0 && (
                    <p className="text-gray-500">No feedback submitted yet.</p>
                )}
            </div>
        </div>
    )
}

export default function FeedbackForm() {
    const [feedback, setFeedback] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const { currentUser } = useRoles()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!feedback.trim()) return

        setSubmitting(true)
        try {
            await addDoc(collection(db, 'feedback'), {
                text: feedback,
                userId: currentUser?.uid || null,
                userName: currentUser?.displayName || 'Anonymous',
                userEmail: currentUser?.email || null,
                createdAt: Timestamp.now()
            })
            setFeedback('')
            addToast({ description: 'Thanks for your feedback!', color: 'success' })
        } catch (error) {
            console.error('Error submitting feedback:', error)
            addToast({ description: 'Failed to submit feedback', color: 'danger' })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <>
            <form onSubmit={handleSubmit} className="max-w-2xl sm:mx-auto">
                <Textarea
                    placeholder="Share your thoughts, suggestions, or report issues..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    minRows={4}
                    className="mb-4"
                />
                <Button
                    type="submit"
                    color="primary"
                    isLoading={submitting}
                    isDisabled={!feedback.trim() || submitting}
                >
                    Submit
                </Button>
            </form>

            <FeedbackList />
        </>
    )
}
