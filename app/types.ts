import { Timestamp } from "@firebase/firestore"

export interface CalendarEvent {
    id: string
    title: string
    date: Timestamp
    startTime: number
    endTime: number
    location: string
    description: string
    routeLink: string
}

export interface Signup {
    createdAt: Timestamp
    name: string
    userId: string
}

export interface Comment {
    createdAt: Timestamp
    name: string
    userId: string
    text: string
}

export type EventMessage = ({ type: 'c' } & Comment) | ({ type: 's' } & Signup)
