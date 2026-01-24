import { NextRequest, NextResponse } from 'next/server'
import { logRequest } from '@/lib/logging'

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
