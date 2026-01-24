import { Timestamp } from "@firebase/firestore"

export type MemberRole = "guest" | "leader" | "member" | "admin"

export interface CalendarEvent {
    title: string
    date: Timestamp
    duration: number
    location: string
    description: string
    routeLink: string
    createdAt: Timestamp
    createdBy: string
    createdByName: string
    linkId?: string
    tags: string[]
    isCancelled: boolean
}

export interface EventActivity {
    signupIds: string[]
    signups: { [userId: string]: Signup }
    comments: Comment[],
    notificationSubscribers: NotificationSubscriber[]
}

export interface Signup {
    createdAt: Timestamp
    name: string
    userId: string
    avatarUrl: string | null
    phone: string | null,
    membership: string | null
}

export interface Comment {
    createdAt: Timestamp
    name: string
    userId: string
    avatarUrl: string | null
    text: string
}

export interface NotificationPreferences {
    tags: string[]
    eventUpdates: boolean
    activityForLeader: boolean
    activityForSignups: boolean
    tokens: string[]
}

export interface NotificationSubscriber {
    userId: string
    eventUpdates: boolean
    activity: boolean
}
