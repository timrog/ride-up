'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@heroui/button'
import { Card, CardBody } from '@heroui/card'

const dismissKey = 'pn-dis'

export function dismissPromoteNotifications() {
    if (typeof window === 'undefined') {
        return
    }

    localStorage.setItem(dismissKey, 'true')
}

export default function PromoteNotifications() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        setIsVisible(localStorage.getItem(dismissKey) !== 'true')
    }, [])

    function handleDismiss() {
        dismissPromoteNotifications()
        setIsVisible(false)
    }

    if (!isVisible) {
        return null
    }

    return (
        <Card className="mb-6 border border-primary-200 bg-primary-50">
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="m-0 text-lg">Get instant updates</h3>
                    <p className="m-0 text-foreground-600">
                        Get a notification straight your phone or desktop whenever new rides are posted, others sign up or comment, and more.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button as={Link} href="/notifications" color="secondary">
                        Try it out
                    </Button>
                    <Button variant="light" onPress={handleDismiss}>
                        OK, got it
                    </Button>
                </div>
            </CardBody>
        </Card>
    )
}