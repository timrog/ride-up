'use client'

import { useEffect } from 'react'
import { getMessagingInstance } from '@/lib/firebase/clientApp'
import { onMessage } from 'firebase/messaging'

export function ForegroundMessaging() {
    useEffect(() => {
        const setupForegroundMessaging = async () => {
            const messaging = await getMessagingInstance()
            if (!messaging) return

            onMessage(messaging, (payload) => {
                console.log('Foreground message received:', payload)

                if (payload.notification) {
                    return
                }

                if ('Notification' in window && Notification.permission === 'granted') {
                    const notificationTitle = payload.data?.title || 'New notification'
                    const notificationOptions = {
                        body: payload.data?.body || '',
                        icon: payload.data?.icon || '/app-icon.png',
                        tag: payload.data?.tag || 'notification',
                        data: {
                            url: payload.data?.url || '/',
                            eventId: payload.data?.eventId
                        }
                    }

                    navigator.serviceWorker.ready.then((registration) => {
                        registration.showNotification(notificationTitle, notificationOptions)
                    })
                }
            })
        }

        setupForegroundMessaging()
    }, [])

    return null 
}
