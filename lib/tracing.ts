import { trace, Span, SpanStatusCode, context } from '@opentelemetry/api'
import { jwtDecode } from "jwt-decode"
import { cookies } from 'next/headers'
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

export function enrichSpan(span: Span | undefined, sessionToken: string | undefined) {
    if (!span) return
    if (!sessionToken) return
    const decoded = jwtDecode<DecodedToken>(sessionToken)
    span.setAttribute('user.id', decoded.user_id || decoded.sub || '')
    span.setAttribute('user.email', decoded.email || '')
    span.setAttribute('user.membership', decoded.membership || '')
    span.setAttribute('user.roles', decoded.roles || '')
    span.setAttribute('user.sign_in_provider', decoded.firebase?.sign_in_provider || '')
}

export async function withSpan<T>(
    name: string,
    operation: (span: Span) => Promise<T>,
    attributes: SpanAttributes = {}
): Promise<T> {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('__session')?.value
    enrichSpan(trace.getActiveSpan(), sessionToken)

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
