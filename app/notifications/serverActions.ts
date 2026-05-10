'use server'

import { getAuthenticatedAppForUser } from '@/lib/firebase/serverApp'
import { getAdminApp } from '@/lib/firebase/serverApp'
import { NotificationPreferences } from '../types'
import admin from 'firebase-admin'

export async function sendTestNotification() {
    try {
        const { currentUser } = await getAuthenticatedAppForUser()
        
        if (!currentUser) {
            return { success: false, error: 'User not authenticated' }
        }

        const db = getAdminApp().firestore()
        
        const prefsDoc = await db.collection('notifications').doc(currentUser.uid).get()
        
        if (!prefsDoc.exists) {
            return { success: false, error: 'No notification preferences found' }
        }

        const prefs = prefsDoc.data() as NotificationPreferences
        
        if (!prefs.tokens || prefs.tokens.length === 0) {
            return { success: false, error: 'No notification tokens found. Please save your preferences first.' }
        }

        const eventsSnapshot = await db.collection('events').limit(1).offset(Math.floor(Math.random() * (await db.collection('events').count().get()).data().count)).get()
        const id = eventsSnapshot.docs[0].id

        const message = {
            notification: {
                title: `${process.env.NODE_ENV === 'development' ? 'Development:' : ''} Your notifications work`,
                body: 'Now go out and ride your bike.'
            },
            webpush: { 
                fcmOptions: {  
                    link: `/events/${id}`
                }
            },
            data: {
                url: `/events/${id}`,
                tag: 'test-notification'
            },
            tokens: prefs.tokens
        }

        const response = await admin.messaging().sendEachForMulticast(message)

        if (response.successCount === 0) {
            return { 
                success: false, 
                error: `Failed to send to all ${prefs.tokens.length} token(s)` 
            }
        }

        return { 
            success: true, 
            count: response.successCount,
            failures: response.failureCount
        }
    } catch (error) {
        console.error('Error sending test notification:', error)
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }
    }
}
