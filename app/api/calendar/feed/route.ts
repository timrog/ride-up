import { NextRequest, NextResponse } from 'next/server'
import { collection, query, getDocs, orderBy, where, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/initFirebase'
import { CalendarEvent } from '../../../types'
import { generateICalStream, ICalConfig } from '../ical-utils'
import { withSpan } from '@/lib/tracing'

export async function GET(request: NextRequest) {
    return withSpan('api.calendar.feed', {}, async (span) => {
        try {
            const oneMonthAgo = new Date()
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

            const q = query(
                collection(db, 'events'),
                where('date', '>', Timestamp.fromDate(oneMonthAgo)),
                orderBy('date', 'asc')
            )

            const querySnapshot = await getDocs(q)
            const events = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data() as CalendarEvent
            }))

            span.setAttribute('events.count', events.length)

            const config: ICalConfig = {
                prodId: 'VCGH',
                calName: 'VCGH Signups',
                calDesc: 'Cycling events from VCGH',
                timezone: 'Europe/London',
                refreshInterval: 'PT1H',
                domain: 'vcgh.co.uk',
                organizerName: 'VCGH'
            }

            const stream = new ReadableStream({
                start(controller) {
                    const encoder = new TextEncoder()
                    const iterator = generateICalStream(events, config, "https://calendar.vcgh.co.uk")

                    let result = iterator.next()
                    while (!result.done) {
                        controller.enqueue(encoder.encode(result.value))
                        result = iterator.next()
                    }

                    controller.close()
                }
            })

            return new NextResponse(stream, {
                status: 200,
                headers: {
                    'Content-Type': 'text/calendar; charset=utf-8',
                    'Cache-Control': 'public, max-age=180',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            })

        } catch (error) {
            console.error('Error generating calendar feed:', error)
            return NextResponse.json(
                { error: 'Failed to generate calendar feed' },
                { status: 500 }
            )
        }
    })
}