'use server'

import nodemailer from 'nodemailer'

export async function sendTestEmail(formData: FormData) {
    const email = formData.get('email')?.toString()

    if (!email) {
        return { success: false, error: 'Email address is required' }
    }

    console.log('Sending test email', { action: 'sendTestEmail', recipientEmail: email })

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPassword = process.env.SMTP_PASSWORD
    const smtpFromEmail = process.env.SMTP_FROM_EMAIL || smtpUser

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
        console.log('SMTP configuration missing', { error: 'SMTP configuration missing' })
        return { 
            success: false, 
            error: 'SMTP configuration is incomplete. Please check environment variables.' 
        }
    }

    try {
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort),
            secure: parseInt(smtpPort) === 465,
            auth: {
                user: smtpUser,
                pass: smtpPassword,
            },
        })

        const info = await transporter.sendMail({
            from: smtpFromEmail,
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
