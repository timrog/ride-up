import { trace, Span, SpanStatusCode, context } from '@opentelemetry/api'
import { jwtDecode } from "jwt-decode"
import { cookies, headers } from 'next/headers'
export interface DecodedToken {
    user_id?: string
    sub?: string
    email?: string
    name?: string
    roles?: string[]
    membership?: string
    firebase?: {
        sign_in_provider?: string
    }
}

type SpanAttributes = Record<string, string | number | boolean | undefined>

const serviceName = process.env.OTEL_SERVICE_NAME || 'ride-up'
const tracer = trace.getTracer(serviceName)

function extractNotificationSource(requestUrlOrPath: string | undefined): string | undefined {
    if (!requestUrlOrPath) return undefined

    try {
        const parsed = requestUrlOrPath.startsWith('http://') || requestUrlOrPath.startsWith('https://')
            ? new URL(requestUrlOrPath)
            : new URL(requestUrlOrPath, 'https://placeholder.local')

        return parsed.searchParams.get('ns') || undefined
    } catch {
        return undefined
    }
}

export function enrichSpanFromSession(span: Span | undefined, sessionToken: string | undefined) {
    if (!span) return
    if (!sessionToken) return
    const decoded = jwtDecode<DecodedToken>(sessionToken)
    span.setAttribute('user.id', decoded.user_id || decoded.sub || '')
    span.setAttribute('user.email', decoded.email || '')
    span.setAttribute('user.membership', decoded.membership || '')
    span.setAttribute('user.roles', decoded.roles || '')
    span.setAttribute('user.sign_in_provider', decoded.firebase?.sign_in_provider || '')
}


export function enrichSpanFromRequest(span: Span | undefined, requestUrlOrPath: string | undefined) {
    if (!span) return

    const notificationSource = extractNotificationSource(requestUrlOrPath)
    if (!notificationSource) return

    console.log('notification source:', notificationSource)
    span.setAttribute('notificationSource', notificationSource)
}

export async function withSpan<T>(
    name: string,
    operation: (span: Span) => Promise<T>,
    attributes: SpanAttributes = {}
): Promise<T> {
    const cookieStore = await cookies()
    const headerStore = await headers()
    const requestPath = headerStore.get('x-forwarded-uri')
    const requestUrl = headerStore.get('x-url') || requestPath
    const sessionToken = cookieStore.get('__session')?.value
    const activeSpan = trace.getActiveSpan()
    enrichSpanFromSession(activeSpan, sessionToken)
    enrichSpanFromRequest(activeSpan, requestUrl || undefined)

    const parentContext = context.active()
    const span = tracer.startSpan(
        name,
        {
            attributes: Object.fromEntries(
                Object.entries(attributes).filter(([, v]) => v !== undefined)
            ) as Record<string, string | number | boolean>,
        },
        parentContext
    )

    return context.with(trace.setSpan(parentContext, span), async () => {
        try {
            const result = await operation(span)
            span.setStatus({ code: SpanStatusCode.OK })
            return result
        } catch (error) {
            const err = error as Error
            span.recordException(err)
            span.setStatus({ code: SpanStatusCode.ERROR, message: err.message })
            throw error
        } finally {
            span.end()
        }
    })
}

export function getActiveSpan() {
    return trace.getActiveSpan()
}
