import { trace, SpanStatusCode, Span } from '@opentelemetry/api'

const tracer = trace.getTracer('ride-up')

type SpanAttributes = Record<string, string | number | boolean | undefined>

export async function withSpan<T>(
    name: string,
    attributes: SpanAttributes,
    fn: (span: Span) => Promise<T>
): Promise<T> {
    return tracer.startActiveSpan(name, async (span) => {
        Object.entries(attributes).forEach(([k, v]) => {
            if (v !== undefined) span.setAttribute(k, v)
        })
        try {
            const result = await fn(span)
            span.setStatus({ code: SpanStatusCode.OK })
            return result
        } catch (error) {
            span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) })
            throw error
        } finally {
            span.end()
        }
    })
}

export function getActiveSpan() {
    return trace.getActiveSpan()
}
