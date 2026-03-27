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

        const message = {
            notification: {
                title: 'Your notifications work',
                body: 'Stop messing with them and ride your bike.'
            },
            webpush: { 
                fcmOptions: {  
                    link: '/notifications'
                }
            },
            data: {
                url: `/notifications`,
                tag: 'test-notification'
            },
            tokens: prefs.tokens
        }

        const response = await admin.messaging().sendEachForMulticast(message)
        
        console.log(`Sent test notifications`, response)

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
