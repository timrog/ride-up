declare const firebase: any
declare const clients: any

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js')

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// Register notificationclick BEFORE firebase.messaging() so it fires first.
// FCM's built-in handler focuses existing windows but does not navigate them
// to the link URL — it only opens a new window when no client exists.
// By registering first and calling stopImmediatePropagation we override that.
self.addEventListener('notificationclick', function (event: any) {
    event.stopImmediatePropagation()
    event.notification.close()

    const fcmData = event.notification.data?.FCM_MSG
    const url = fcmData?.fcmOptions?.link || fcmData?.data?.url || event.notification.data?.url || '/'
    const absoluteUrl = new URL(url, self.location.origin).toString()

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async function (clientList: any[]) {
            for (const client of clientList) {
                await client.focus()
                client.postMessage({ type: 'notification-click', url: absoluteUrl })

                if ('navigate' in client) {
                    try {
                        await client.navigate(absoluteUrl)
                    } catch {
                        // iOS standalone can ignore navigate on an existing client.
                    }
                }
                return
            }
            return clients.openWindow(absoluteUrl)
        })
    )
})

firebase.initializeApp(firebaseConfig)
const messaging = firebase.messaging()

messaging.onBackgroundMessage(function (payload: any) {
    const title = payload.notification?.title || payload.data?.title || 'Notification'
    const options = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: payload.notification?.icon || '/app-icon.png',
        tag: payload.data?.tag || 'notification',
        data: payload.data
    };
    (self as any).registration.showNotification(title, options)
})
