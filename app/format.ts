import { Timestamp } from "@google-cloud/firestore"

export function toFormattedDate(date: Timestamp): string {
    return date.toDate().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'short'
    })
}
export function toFormattedTime(date: Timestamp): string {
    return date.toDate().toLocaleTimeString('en-GB', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    })
}