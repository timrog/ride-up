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
import { ArrowUpOnSquareIcon, PlusCircleIcon } from "@heroicons/react/24/outline"
import WithAuth from "app/withAuthClient"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

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
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

    useEffect(() => {
        if (user) {
            loadPreferences()
        }
        
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission)
        }
    }, [user])

    useEffect(() => {
        function handleBeforeInstallPrompt(event: Event) {
            const installEvent = event as BeforeInstallPromptEvent
            installEvent.preventDefault()
            setInstallPromptEvent(installEvent)
        }

        function handleAppInstalled() {
            setInstallPromptEvent(null)
        }

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
        window.addEventListener('appinstalled', handleAppInstalled)

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
            window.removeEventListener('appinstalled', handleAppInstalled)
        }
    }, [])

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
            throw error
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

    async function handleInstallApp() {
        if (!installPromptEvent) {
            addToast({
                title: 'Installation Not Available',
                description: 'Use your browser menu and select "Add to Home screen".',
                color: 'warning'
            })
            return
        }

        try {
            await installPromptEvent.prompt()
            const { outcome } = await installPromptEvent.userChoice

            if (outcome === 'accepted') {
                addToast({
                    title: 'Installation Started',
                    description: 'Follow your browser prompts to finish installing.',
                    color: 'success'
                })
            }
        } catch (error) {
            console.error('Error showing install prompt:', error)
            addToast({
                title: 'Install Failed',
                description: 'Could not open the install prompt. Try browser menu > Add to Home screen.',
                color: 'danger'
            })
        } finally {
            setInstallPromptEvent(null)
        }
    }

    async function savePreferences() {
        if (!user) return
        
        await requestNotificationPermission()

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
                description: 'Notifications have been updated and enabled.',
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

    function Instructions({ context }: { context: string }) {
        if (notificationPermission === 'granted') {
            return (
                <div className="p-4 bg-success-50 rounded-lg mb-6 text-success-700">
                    ✓ Notifications are enabled
                </div>
            )
        }

        switch (context) {
            case 'ios-browser':
                return (
                    <div className="p-4 bg-warning-50 rounded-lg mb-6">
                        <p className="text-warning-700 font-semibold mb-2">iPhone instructions:</p>
                        <p>To get notifications on this iPhone/iPad, you need follow a few simple steps to install Signups on to your home screen.</p>
                        <ol className="list-decimal list-inside space-y-1 text-warning-700">
                            <li>In Safari, tap the Share button <ArrowUpOnSquareIcon className="inline-block w-4 h-4 ml-1" /></li>
                            <li>Scroll down and tap "<PlusCircleIcon className="inline-block w-4 h-4 ml-1" /> Add to Home Screen"</li>
                            <li>Go to the home screen and open the installed app and sign in</li>
                            <li>In the app, go to Notifications in the menu to setup your notifications</li>
                        </ol>
                    </div>
                )

            case 'android-browser':
                return (
                    <div className="p-4 bg-warning-50 rounded-lg mb-6">
                        <p className="text-warning-700 font-semibold mb-2">Android instructions:</p>
                        <p>To get notifications on this device, you need follow a few simple steps to install Signups on to your home screen.</p>
                        <ol className="list-decimal list-inside space-y-1 text-warning-700">
                            <li>Tap Install App below, or use browser menu (⋮)
                                <div>
                                    <Button
                                        color="warning"
                                        variant="flat"
                                        className="mt-4"
                                        onPress={handleInstallApp}
                                        isDisabled={!installPromptEvent}
                                    >
                                        Install App
                                    </Button>
                                </div>
                            </li>
                            <li>Select "Add to Home screen" or "Install app" if prompted</li>
                            <li>Open the app from your home screen</li>
                            <li>Go to Notifications in the menu to setup your notifications.</li>
                        </ol>
                    </div>
                )
            
            default:
                return null
        }
    }

    if (!user) {
        return null
    }

    if (isLoading) {
        return (
            <div className="container mx-auto p-6">
                <p>Loading preferences...</p>
            </div>
        )
    }

    var context = getBrowserContext()

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6">Notification Preferences</h1>

            <Instructions context={context} />

            {context != "ios-browser" && context != "android-browser" && (
            <div className="space-y-6">
                <div>
                        <h2 className="text-xl font-semibold mb-3">Notify me whenever someone posts one of these...</h2>
                    <SelectableTags 
                        value={preferences.tags}
                        onValueChange={(tags) => setPreferences(prev => ({ ...prev, tags }))}
                    />
                </div>

                <div className="space-y-3">
                        <h2 className="text-xl font-semibold mb-3">And let me know about...</h2>
                    
                    <Switch
                        isSelected={preferences.eventUpdates}
                        onValueChange={(checked) => setPreferences(prev => ({ ...prev, eventUpdates: checked }))}
                    >
                            Updates to rides I'm signed up to (changes, cancellations)
                    </Switch>

                        <WithAuth role="leader">
                            <Switch
                                isSelected={preferences.activityForLeader}
                                onValueChange={(checked) => setPreferences(prev => ({ ...prev, activityForLeader: checked }))}
                            >
                                Activity on rides I'm leading (signups, comments)
                            </Switch>
                        </WithAuth>

                    <Switch
                        isSelected={preferences.activityForSignups}
                        onValueChange={(checked) => setPreferences(prev => ({ ...prev, activityForSignups: checked }))}
                    >
                            Activity on rides I'm signed up to (new signups, comments)
                    </Switch>
                </div>

                <div className="flex gap-3">
                    <Button
                        color="primary"
                        size="lg"
                        onPress={savePreferences}
                            isLoading={isSaving}
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

                {preferences.tokens.length === 0 && notificationPermission === 'granted' && (
                    <p className="text-warning-600 text-sm">
                        Save your preferences first to enable test notifications
                    </p>
                )}
            </div>
            )}
        </div>
    )
}
