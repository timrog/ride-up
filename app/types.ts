import { Timestamp } from "@firebase/firestore"

export type MemberRole = "guest" | "leader" | "member" | "admin"

export interface CalendarEvent {
    id: string
    title: string
    date: Timestamp
    duration: number
    location: string
    description: string
    routeLink: string
    createdAt: Timestamp
    createdBy: string
    tags: string[]
    isCancelled: boolean
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
