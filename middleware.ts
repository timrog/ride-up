import { NextRequest, NextResponse } from 'next/server'
import { logRequest } from '@/lib/logging'
import { trace } from '@opentelemetry/api'
import { jwtDecode } from 'jwt-decode'

interface DecodedToken {
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

export function middleware(request: NextRequest) {
    const sessionToken = request.cookies.get('__session')?.value

    logRequest(sessionToken, {
        httpRequest: {
            requestMethod: request.method,
            requestUrl: request.nextUrl.pathname,
            userAgent: request.headers.get('user-agent'),
            remoteIp: request.headers.get('x-forwarded-for'),
        },
    })

    const span = trace.getActiveSpan()
    if (span && sessionToken) {
        try {
            const decoded = jwtDecode<DecodedToken>(sessionToken)
            if (decoded.user_id || decoded.sub) {
                span.setAttribute('user.id', decoded.user_id || decoded.sub || '')
            }
            if (decoded.email) {
                span.setAttribute('user.email', decoded.email)
            }
            if (decoded.membership) {
                span.setAttribute('user.membership', decoded.membership)
            }
            if (decoded.roles) {
                span.setAttribute('user.roles', decoded.roles)
            }
            if (decoded.firebase?.sign_in_provider) {
                span.setAttribute('user.sign_in_provider', decoded.firebase.sign_in_provider)
            }
        } catch {
            span.setAttribute('user.auth_error', 'invalid_token')
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/api/:path*',
        '/events/:path*',
        '/user/:path*',
        '/admin/:path*',
        '/create/:path*',
        '/notifications/:path*',
    ]
}
