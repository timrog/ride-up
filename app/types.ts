import { Timestamp } from "@firebase/firestore"

export interface CalendarEvent {
    id: string
    title: string
    date: Timestamp // now includes both date and start time
    duration: number // duration in minutes
    location: string
    description: string
    routeLink: string
    createdAt: Timestamp
    createdBy: string
}

export interface EventActivity {
    signups: { [userId: string]: Signup }
    comments: Comment[]
}

export interface Signup {
    createdAt: Timestamp
    name: string
}

export interface Comment {
    createdAt: Timestamp
    name: string
    userId: string
    text: string
}
