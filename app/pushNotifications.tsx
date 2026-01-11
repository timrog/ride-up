'use client'
import { Button } from "@heroui/react"
import { useState, useEffect } from 'react'
import { sendNotification, subscribeUser, unsubscribeUser } from './pushActions'

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export function PushNotificationManager() {
    const [isSupported, setIsSupported] = useState(false)
    const [subscription, setSubscription] = useState<PushSubscription | null>(
        null
    )

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
            registerServiceWorker()
        }
    }, [])

    async function registerServiceWorker() {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none',
        })
        const sub = await registration.pushManager.getSubscription()
        setSubscription(sub)
    }

    async function subscribeToPush() {
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(
                process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
            ),
        })
        setSubscription(sub)
        const serializedSub = JSON.parse(JSON.stringify(sub))
        await subscribeUser(serializedSub)
    }

    async function unsubscribeFromPush() {
        if (subscription) {
            await subscription.unsubscribe()
            setSubscription(null)
            const serializedSub = JSON.parse(JSON.stringify(subscription))
            await unsubscribeUser(serializedSub)
        }
    }

    const [error, setError] = useState<string>()
    async function sendTestNotification() {
        if (subscription) {
            await sendNotification("Hello world")
            setError(error)
        }
    }

    if (!isSupported) {
        return <p>Push notifications are not supported in this browser.</p>
    }

    return (
        <div>
            {subscription ? (
                <>
                    <p>You are subscribed to push notifications.</p>
                    <div className="flex gap-2">
                        <Button onPress={unsubscribeFromPush}>Unsubscribe</Button>
                        <Button onPress={sendTestNotification}>Send Test</Button>
                    </div>
                    {error && <div className="alert alert-danger" role="alert">
                        {error}
                    </div>}
                </>
            ) : (
                <>
                    <p>You are not subscribed to push notifications.</p>
                        <Button onPress={subscribeToPush}>Subscribe</Button>
                </>)}
        </div>
    )
}