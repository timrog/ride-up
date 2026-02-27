'use client'

import { Button, Form, Input, addToast } from "@heroui/react"
import { sendTestEmail } from './serverActions'
import { useState } from 'react'

export default function TestEmailForm() {
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setIsLoading(true)
        try {
            const result = await sendTestEmail(formData)
            
            if (result.success) {
                addToast({
                    title: 'Email sent successfully',
                    description: `Test email sent to ${formData.get('email')}`,
                    color: 'success'
                })
            } else {
                addToast({
                    title: 'Failed to send email',
                    description: result.error,
                    color: 'danger'
                })
            }
        } catch (error) {
            addToast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'An unexpected error occurred',
                color: 'danger'
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form action={handleSubmit}>
            <Input 
                name="email"
                type="email"
                placeholder="Email to send test to" 
                isRequired
                isDisabled={isLoading}
            />
            <Button 
                type="submit" 
                isLoading={isLoading}
            >
                Send test email
            </Button>
        </Form>
    )
}
