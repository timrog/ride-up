'use client'

import { useState, useEffect } from 'react'
import { Button, Switch } from '@heroui/react'
import { useRouter } from 'next/navigation'
import SelectableTags from '@/components/SelectableTags'
import { useAuth } from '@/lib/hooks/useAuth'
import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore'
import { db } from '@/lib/firebase/clientApp'
import { getMessagingInstance } from '@/lib/firebase/clientApp'
import { getToken } from 'firebase/messaging'
import { NotificationPreferences } from "app/types"
import { sendTestNotification } from './serverActions'
import { addToast } from '@heroui/react'

export default function NotificationsPage() {
    const { user } = useAuth()
    const router = useRouter()
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        tags: [],
        eventUpdates: true,
        activityForLeader: true,
        activityForSignups: true,
        tokens: []
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isSendingTest, setIsSendingTest] = useState(false)
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')

    useEffect(() => {
        if (user) {
            loadPreferences()
        }
        
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission)
        }
    }, [user])

    async function loadPreferences() {
        if (!user) return
        
        try {
            const docRef = doc(db, 'notifications', user.uid)
            const docSnap = await getDoc(docRef)
            
            if (docSnap.exists()) {
                const data = docSnap.data()
                setPreferences({
                    tags: data.tags || [],
                    eventUpdates: data.eventUpdates ?? true,
                    activityForLeader: data.activityForLeader ?? true,
                    activityForSignups: data.activityForSignups ?? true,
                    tokens: data.tokens || []
                })
            }
        } catch (error) {
            console.error('Error loading preferences:', error)
        } finally {
            setIsLoading(false)
        }
    }

    async function requestNotificationPermission() {
        if (!('Notification' in window)) {
            addToast({
                title: 'Notifications Unsupported',
                description: 'This browser does not support notifications.',
                color: 'danger'
            })
            return
        }

        try {
            const permission = await Notification.requestPermission()
            setNotificationPermission(permission)
        } catch (error) {
            console.error('Error requesting permission:', error)
        }
    }

    async function handleSendTest() {
        try {
            setIsSendingTest(true)
            await new Promise(resolve => setTimeout(resolve, 5000))
            await sendTestNotification()
        } finally {
            setIsSendingTest(false)
        }
    }

    async function savePreferences() {
        if (!user) return
        
        setIsSaving(true)
        try {
            const messaging = await getMessagingInstance()
            if (!messaging) {
                throw new Error('Messaging not supported')
            }

            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none'
            })

            await navigator.serviceWorker.ready

            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
            if (!vapidKey) {
                throw new Error('VAPID key not configured')
            }

            const token = await getToken(messaging, {
                vapidKey,
                serviceWorkerRegistration: registration
            })

            if (!token) {
                throw new Error('Failed to get FCM token')
            }

            const docRef = doc(db, 'notifications', user.uid)
            await setDoc(docRef, {
                tags: preferences.tags,
                eventUpdates: preferences.eventUpdates,
                activityForLeader: preferences.activityForLeader,
                activityForSignups: preferences.activityForSignups,
                tokens: arrayUnion(token),
                updatedAt: new Date()
            }, { merge: true })

            addToast({
                title: 'Preferences Saved',
                description: 'Your notification preferences were saved successfully.',
                color: 'success'
            })
            router.push('/')
        } catch (error) {
            console.error('Error saving preferences:', error)
            addToast({
                title: 'Save Failed',
                description: 'Failed to save preferences. Please enable notifications first.',
                color: 'danger'
            })
        } finally {
            setIsSaving(false)
        }
    }

    function getBrowserContext() {
        const ua = navigator.userAgent
        const isIOS = /iPad|iPhone|iPod/.test(ua)
        const isAndroid = /Android/.test(ua)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua)

        if (isIOS && !isStandalone) {
            return 'ios-browser'
        } else if (isIOS && isStandalone) {
            return 'ios-pwa'
        } else if (isAndroid && !isStandalone) {
            return 'android-browser'
        } else if (isAndroid && isStandalone) {
            return 'android-pwa'
        } else {
            return 'desktop'
        }
    }

    function renderInstructions() {
        const context = getBrowserContext()

        if (notificationPermission === 'granted') {
            return (
                <div className="p-4 bg-success-50 rounded-lg mb-6">
                    <p className="text-success-700">✓ Notifications are enabled</p>
                </div>
            )
        }

        switch (context) {
            case 'ios-browser':
                return (
                    <div className="p-4 bg-warning-50 rounded-lg mb-6">
                        <p className="text-warning-700 font-semibold mb-2">iOS Safari Instructions:</p>
                        <ol className="list-decimal list-inside space-y-1 text-warning-700">
                            <li>Tap the Share button (square with arrow)</li>
                            <li>Scroll down and tap "Add to Home Screen"</li>
                            <li>Open the app from your home screen</li>
                            <li>Return here to enable notifications</li>
                        </ol>
                    </div>
                )
            
            case 'ios-pwa':
            case 'android-pwa':
            case 'desktop':
                return (
                    <div className="p-4 bg-primary-50 rounded-lg mb-6">
                        <p className="text-primary-700 mb-3">Enable push notifications to receive updates about rides</p>
                        <Button 
                            color="primary" 
                            onPress={requestNotificationPermission}
                            isDisabled={notificationPermission === 'denied'}
                        >
                            Enable Notifications
                        </Button>
                        {notificationPermission === 'denied' && (
                            <p className="text-danger-600 mt-2 text-sm">
                                Notifications are blocked. Please enable them in your browser settings.
                            </p>
                        )}
                    </div>
                )
            
            case 'android-browser':
                return (
                    <div className="p-4 bg-warning-50 rounded-lg mb-6">
                        <p className="text-warning-700 font-semibold mb-2">Android Instructions:</p>
                        <ol className="list-decimal list-inside space-y-1 text-warning-700">
                            <li>Tap the menu (⋮) in your browser</li>
                            <li>Select "Add to Home screen" or "Install app"</li>
                            <li>Open the app from your home screen</li>
                            <li>Return here to enable notifications</li>
                        </ol>
                    </div>
                )
            
            default:
                return null
        }
    }

    if (!user) {
        return (
            <div className="container mx-auto p-6">
                <p>Please sign in to manage notification preferences</p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <p>Loading preferences...</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6">Notification Preferences</h1>

            {renderInstructions()}

            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-semibold mb-3">Notify me about new events with these tags:</h2>
                    <SelectableTags 
                        value={preferences.tags}
                        onValueChange={(tags) => setPreferences(prev => ({ ...prev, tags }))}
                    />
                </div>

                <div className="space-y-3">
                    <h2 className="text-xl font-semibold mb-3">Notification Settings:</h2>
                    
                    <Switch
                        isSelected={preferences.eventUpdates}
                        onValueChange={(checked) => setPreferences(prev => ({ ...prev, eventUpdates: checked }))}
                    >
                        Event updates (changes, cancellations)
                    </Switch>

                    <Switch
                        isSelected={preferences.activityForLeader}
                        onValueChange={(checked) => setPreferences(prev => ({ ...prev, activityForLeader: checked }))}
                    >
                        Activity on events I'm leading (signups, comments)
                    </Switch>

                    <Switch
                        isSelected={preferences.activityForSignups}
                        onValueChange={(checked) => setPreferences(prev => ({ ...prev, activityForSignups: checked }))}
                    >
                        Activity on events I'm signed up to (new signups, comments)
                    </Switch>
                </div>

                <div className="flex gap-3">
                    <Button
                        color="primary"
                        size="lg"
                        onPress={savePreferences}
                        isLoading={isSaving}
                        isDisabled={notificationPermission !== 'granted'}
                    >
                        Save Preferences
                    </Button>

                    <Button
                        color="secondary"
                        size="lg"
                        onPress={handleSendTest}
                        isLoading={isSendingTest}
                        isDisabled={preferences.tokens.length === 0}
                    >
                        Send Test Notification
                    </Button>
                </div>

                {notificationPermission !== 'granted' && (
                    <p className="text-warning-600 text-sm">
                        Enable notifications above to save your preferences
                    </p>
                )}
                {preferences.tokens.length === 0 && notificationPermission === 'granted' && (
                    <p className="text-warning-600 text-sm">
                        Save your preferences first to enable test notifications
                    </p>
                )}
            </div>
        </div>
    )
}
