'use client'

import { useState, useEffect } from 'react'
import { Button, Switch } from '@heroui/react'
import { useRouter } from 'next/navigation'
import SelectableTags from '@/components/SelectableTags'
import { useAuth } from '@/lib/hooks/useAuth'
import { doc, getDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
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
    const [isDisabling, setIsDisabling] = useState(false)
    const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false)
    const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

    useEffect(() => {
        if (!user) {
            setIsLoading(false)
            setIsNotificationsEnabled(false)
            return
        }

        setIsLoading(true)
        void loadPreferences()
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
        let loadedPreferences: NotificationPreferences = {
            tags: [],
            eventUpdates: true,
            activityForLeader: true,
            activityForSignups: true,
            tokens: []
        }
        
        try {
            const docRef = doc(db, 'notifications', user.uid)
            const docSnap = await getDoc(docRef)
            
            if (docSnap.exists()) {
                const data = docSnap.data()
                loadedPreferences = {
                    tags: data.tags || [],
                    eventUpdates: data.eventUpdates ?? true,
                    activityForLeader: data.activityForLeader ?? true,
                    activityForSignups: data.activityForSignups ?? true,
                    tokens: data.tokens || []
                }
            }

            setPreferences(loadedPreferences)
            await refreshNotificationEnabledStatus(loadedPreferences.tokens)
        } catch (error) {
            console.error('Error loading preferences:', error)
        } finally {
            setIsLoading(false)
        }
    }

    async function requestNotificationPermission(): Promise<NotificationPermission> {
        if (!('Notification' in window)) {
            addToast({
                title: 'Notifications Unsupported',
                description: 'This browser does not support notifications.',
                color: 'danger'
            })
            return 'denied'
        }

        try {
            const permission = await Notification.requestPermission()
            return permission
        } catch (error) {
            console.error('Error requesting permission:', error)
            throw error
        }
    }

    async function getNotificationServiceWorkerRegistration() {
        return navigator.serviceWorker.getRegistration('/')
    }

    async function getCurrentDeviceToken(registration: ServiceWorkerRegistration) {
        const messaging = await getMessagingInstance()
        if (!messaging) {
            return null
        }

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) {
            throw new Error('VAPID key not configured')
        }

        return getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: registration
        })
    }

    async function refreshNotificationEnabledStatus(savedTokens: string[]) {
        if (!('Notification' in window)) {
            setIsNotificationsEnabled(false)
            return
        }

        const permission = Notification.permission
        if (permission !== 'granted') {
            setIsNotificationsEnabled(false)
            return
        }

        const registration = await getNotificationServiceWorkerRegistration()
        if (!registration) {
            setIsNotificationsEnabled(false)
            return
        }

        const token = await getCurrentDeviceToken(registration)
        if (!token) {
            setIsNotificationsEnabled(false)
            return
        }

        setIsNotificationsEnabled(savedTokens.includes(token))
    }

    async function disableNotifications() {
        if (!user) return
        setIsDisabling(true)
        try {
            const registration = await getNotificationServiceWorkerRegistration()
            const token = registration ? await getCurrentDeviceToken(registration) : null

            if (token) {
                const docRef = doc(db, 'notifications', user.uid)
                await setDoc(docRef, { tokens: arrayRemove(token) }, { merge: true })
                setPreferences(prev => ({
                    ...prev,
                    tokens: prev.tokens.filter(savedToken => savedToken !== token)
                }))
            }

            if (registration) {
                await registration.unregister()
            }

            setIsNotificationsEnabled(false)

            addToast({
                title: 'Notifications Disabled',
                description: 'Notifications have been disabled on this device.',
                color: 'success'
            })

        } catch (error) {
            console.error('Error disabling notifications:', error)
            addToast({
                title: 'Failed to Disable',
                description: 'Could not disable notifications. Please try again.',
                color: 'danger'
            })
        } finally {
            setIsDisabling(false)
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
        
        const permission = await requestNotificationPermission()
        if (permission !== 'granted') {
            addToast({
                title: 'Permission Required',
                description: 'Please allow notifications to enable them on this device.',
                color: 'warning'
            })
            return
        }

        setIsSaving(true)
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none'
            })

            await navigator.serviceWorker.ready
            const token = await getCurrentDeviceToken(registration)

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

            setPreferences(prev => ({
                ...prev,
                tokens: prev.tokens.includes(token)
                    ? prev.tokens
                    : [...prev.tokens, token]
            }))
            setIsNotificationsEnabled(true)

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
        if (isNotificationsEnabled) {
            return (
                <div className="p-4 bg-success-50 rounded-lg mb-6 text-success-700">
                    <p>✓ Notifications are enabled</p>
                    <Button
                        color="danger"
                        variant="flat"
                        size="sm"
                        className="mt-2"
                        onPress={disableNotifications}
                        isLoading={isDisabling}
                    >
                        Disable on this device
                    </Button>
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
    const isPermissionGranted = 'Notification' in window && Notification.permission === 'granted'

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
                            Enable Notifications
                    </Button>

                    <Button
                        color="secondary"
                        size="lg"
                        onPress={handleSendTest}
                        isLoading={isSendingTest}
                            isDisabled={!isNotificationsEnabled}
                    >
                        Send Test Notification
                    </Button>
                </div>

            </div>
            )}
        </div>
    )
}
