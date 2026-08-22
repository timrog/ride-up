'use client'

import { Button, addToast } from "@heroui/react"
import { ArrowUpOnSquareIcon } from "@heroicons/react/24/outline"

export default function EventHeaderIcons() {
    const handleShare = async () => {
        const url = window.location.href

        if (navigator.share) {
            try {
                await navigator.share({ url })
                return
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return
                }
            }
        }

        if (navigator.clipboard?.writeText) {
            try {
                await navigator.clipboard.writeText(url)
                addToast({ description: 'Link copied to clipboard.', color: 'success' })
                return
            } catch {
                addToast({ description: 'Failed to copy link to clipboard.', color: 'danger' })
                return
            }
        }

        addToast({ description: 'Sharing is not supported on this browser.', color: 'warning' })
    }

    return (
        <Button
            isIconOnly
            variant="light"
            color="secondary"
            title="Share link to this event"
            aria-label="Share link to this event"
            onPress={handleShare}
        >
            <ArrowUpOnSquareIcon />
        </Button>
    )
}
