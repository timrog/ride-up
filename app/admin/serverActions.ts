'use server'

import nodemailer from 'nodemailer'
import { getAppSecrets } from '@/lib/secrets'

export async function sendTestEmail(formData: FormData) {
    const email = formData.get('email')?.toString()

    if (!email) {
        return { success: false, error: 'Email address is required' }
    }

    console.log('Sending test email', { action: 'sendTestEmail', recipientEmail: email })

    let secrets
    try {
        secrets = getAppSecrets()
    } catch (error) {
        console.log('Failed to load secrets', { error: error instanceof Error ? error.message : String(error) })
        return { 
            success: false, 
            error: 'Configuration error: unable to load secrets' 
        }
    }

    const { smtp } = secrets

    try {
        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.port === 465,
            auth: {
                user: smtp.user,
                pass: smtp.password,
            },
        })

        const info = await transporter.sendMail({
            from: smtp.fromEmail,
            to: email,
            subject: 'Test Email from Ride Up',
            text: 'This is a test email from your Ride Up admin panel.',
            html: '<p>This is a <strong>test email</strong> from your Ride Up admin panel.</p>',
        })

        console.log('Test email sent successfully', { messageId: info.messageId, success: true })
        return { success: true, messageId: info.messageId }
    } catch (error) {
        console.error('Failed to send test email', error)
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Failed to send email' 
        }
    }
}
