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

                if ('Notification' in window && Notification.permission === 'granted') {
                    const notificationTitle = payload.notification?.title || payload.data?.title || 'New notification'
                    const notificationOptions = {
                        body: payload.notification?.body || payload.data?.body || '',
                        icon: payload.notification?.icon || payload.data?.icon || '/icon.png',
                        tag: payload.data?.tag || 'notification',
                        data: {
                            url: payload.data?.url || '/',
                            eventId: payload.data?.eventId
                        }
                    }

                    const notification = new Notification("FG" +notificationTitle, notificationOptions)
                    
                    notification.onclick = (event) => {
                        event.preventDefault()
                        const url = (notification as any).data?.url || '/'
                        window.location.href = url
                        notification.close()
                    }
                }
            })
        }

        setupForegroundMessaging()
    }, [])

    return null 
}
