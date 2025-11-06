import { CalendarEvent } from '../../types'

export function formatICalDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export function escapeICalText(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '')
}

export function wrapICalLine(line: string): string {
    if (line.length <= 75) return line

    let wrapped = ''
    let remaining = line

    while (remaining.length > 75) {
        wrapped += remaining.substring(0, 75) + '\r\n '
        remaining = remaining.substring(75)
    }
    wrapped += remaining

    return wrapped
}

export interface ICalConfig {
    prodId: string
    calName: string
    calDesc: string
    timezone?: string
    refreshInterval?: string
    domain: string
    organizerEmail: string
    organizerName: string
}

export function* generateICalStream(
    events: (CalendarEvent & { id: string })[],
    config: ICalConfig,
    baseUrl?: string
) {
    yield 'BEGIN:VCALENDAR\r\n'
    yield 'VERSION:2.0\r\n'
    yield `PRODID:-//${config.prodId}//Calendar//EN\r\n`
    yield 'CALSCALE:GREGORIAN\r\n'
    yield 'METHOD:PUBLISH\r\n'
    yield `X-WR-CALNAME:${config.calName}\r\n`
    yield `X-WR-CALDESC:${config.calDesc}\r\n`
    if (config.timezone) {
        yield `X-WR-TIMEZONE:${config.timezone}\r\n`
    }
    if (config.refreshInterval) {
        yield `REFRESH-INTERVAL;VALUE=DURATION:${config.refreshInterval}\r\n`
    }

    for (const event of events) {
        const startDate = event.date.toDate()
        const endDate = new Date(startDate.getTime() + (event.duration || 180) * 60 * 1000)

        const uid = `${event.id}@${config.domain}`
        const summary = escapeICalText(event.title)
        let description = escapeICalText(event.description || '')
        const location = escapeICalText(event.location || '')
        const organizer = escapeICalText(event.createdByName || config.organizerName)

        if (event.tags && event.tags.length > 0) {
            const tagsText = `\\n\\nTags: ${event.tags.join(', ')}`
            description += tagsText
        }

        if (event.routeLink) {
            description += `\\n\\nRoute: ${event.routeLink}`
        }

        const eventLines = [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTART:${formatICalDate(startDate)}`,
            `DTEND:${formatICalDate(endDate)}`,
            `DTSTAMP:${formatICalDate(new Date())}`,
            `CREATED:${formatICalDate(event.createdAt?.toDate() || new Date())}`,
            `LAST-MODIFIED:${formatICalDate(new Date())}`,
            `SUMMARY:${summary}`,
            `DESCRIPTION:${description}`,
            `LOCATION:${location}`,
            `ORGANIZER;CN=${organizer}:MAILTO:${config.organizerEmail}`,
            `STATUS:${event.isCancelled ? 'CANCELLED' : 'CONFIRMED'}`,
            'TRANSP:OPAQUE',
            'SEQUENCE:0'
        ]

        if (event.tags && event.tags.length > 0) {
            eventLines.push(`CATEGORIES:${event.tags.map(escapeICalText).join(',')}`)
        }

        if (baseUrl) {
            eventLines.push(`URL:${baseUrl}/events/${event.id}`)
        }

        eventLines.push('END:VEVENT')

        for (const line of eventLines) {
            yield wrapICalLine(line) + '\r\n'
        }
    }

    yield 'END:VCALENDAR\r\n'
}

export function createReadableStream(
    events: (CalendarEvent & { id: string })[],
    config: ICalConfig,
    baseUrl?: string
) {
    return new ReadableStream({
        start(controller) {
            const encoder = new TextEncoder()
            const iterator = generateICalStream(events, config, baseUrl)

            let result = iterator.next()
            while (!result.done) {
                controller.enqueue(encoder.encode(result.value))
                result = iterator.next()
            }

            controller.close()
        }
    })
}