import { NextResponse } from 'next/server'

export async function GET() {
    const swContent = `
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js')

firebase.initializeApp({
    apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}",
    authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}",
    projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}",
    storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}",
    messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}",
    appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}"
})

const messaging = firebase.messaging()

// messaging.onBackgroundMessage((payload) => {
//     console.log('Received background message:', payload)
    
//     const notificationTitle = payload.notification?.title || payload.data?.title || 'New notification'
//     const notificationOptions = {
//         body: payload.notification?.body || payload.data?.body || '',
//         icon: payload.notification?.icon || payload.data?.icon || '/icon.png',
//         badge: payload.notification?.badge || payload.data?.badge || '/badge.png',
//         tag: payload.data?.tag || 'notification',
//         data: {
//             url: payload.data?.url || payload.fcmOptions?.link || '/',
//             eventId: payload.data?.eventId
//         }
//     }
    
//     return self.registration.showNotification("BG" + notificationTitle, notificationOptions)
// })

// self.addEventListener('notificationclick', function (event) {
//     console.log('Notification clicked:', event.notification.data)
//     event.notification.close()

//     const urlToOpen = (event.notification.data && event.notification.data.url) || '/'

//     event.waitUntil(
//         clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
//             for (let i = 0; i < clientList.length; i++) {
//                 const client = clientList[i]
//                 if (client.url === urlToOpen && 'focus' in client) {
//                     return client.focus()
//                 }
//             }
//             if (clientList.length)
//             {
//                 return clientList[0].focus()
//             }
//             if (clients.openWindow) {
//                 return clients.openWindow(urlToOpen)
//             }
//         })
//     )
// })
`

    return new NextResponse(swContent, {
        headers: {
            'Content-Type': 'application/javascript',
            'Service-Worker-Allowed': '/'
        }
    })
}
