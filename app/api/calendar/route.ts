import { NextRequest, NextResponse } from 'next/server'
import { collection, query, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase/initFirebase'
import { CalendarEvent } from '../../types'
import { generateICalStream, createReadableStream, ICalConfig } from './ical-utils'

export async function GET(request: NextRequest) {
    try {
        const eventsRef = collection(db, 'events')
        const q = query(eventsRef, orderBy('date', 'asc'))
        const querySnapshot = await getDocs(q)

        const events = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data() as CalendarEvent
        }))

        const config: ICalConfig = {
            prodId: 'RideUp',
            calName: 'RideUp Events',
            calDesc: 'Upcoming cycling events from RideUp',
            domain: 'rideup.app',
            organizerEmail: 'noreply@rideup.app',
            organizerName: 'RideUp'
        }

        const stream = createReadableStream(events, config)

        return new NextResponse(stream, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'attachment; filename="rideup-events.ics"',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        })

    } catch (error) {
        console.error('Error generating calendar:', error)
        return NextResponse.json(
            { error: 'Failed to generate calendar' },
            { status: 500 }
        )
    }
}