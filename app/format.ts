import { Timestamp } from "@google-cloud/firestore"

export function toFormattedDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'short'
    })
}
export function toFormattedTime(date: Date): string {
    return date.toLocaleTimeString('en-GB', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    })
}