import { NextRequest, NextResponse } from 'next/server'
import { jwtDecode } from 'jwt-decode'

interface DecodedToken {
    user_id: string
    email?: string
    name?: string
    roles?: string[]
    membership?: string
}

export function middleware(request: NextRequest) {
    const sessionToken = request.cookies.get('__session')?.value

    const logData: Record<string, unknown> = {
        severity: 'INFO',
        path: request.nextUrl.pathname,
        method: request.method,
        userAgent:request.headers.get('user-agent')
    }

    if (sessionToken) {
        try {
            const decoded = jwtDecode<DecodedToken>(sessionToken)
            logData.userId = decoded.user_id
            logData.email = decoded.email
            logData.displayName = decoded.name
            logData.roles = decoded.roles
            logData.membership = decoded.membership
        } catch {
            logData.authError = 'Invalid session token'
        }
    } else {
        logData.authenticated = false
    }

    console.log(logData)

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
