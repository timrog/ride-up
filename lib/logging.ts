import { jwtDecode } from 'jwt-decode'

interface DecodedToken {
    user_id?: string
    sub?: string
    email?: string
    name?: string
    roles?: string[]
    membership?: string
    sign_in_provider?: string
}

interface LogContext {
    action?: string
    httpRequest?: {
        requestMethod: string
        requestUrl: string
        userAgent: string | null
        remoteIp: string | null
    }
}

export function logRequest(sessionToken: string | undefined, context: LogContext) {
    const logData: Record<string, unknown> = {
        severity: 'INFO',
        ...context,
    }

    if (sessionToken) {
        try {
            const decoded = jwtDecode<DecodedToken>(sessionToken)
            logData.userId = decoded.user_id || decoded.sub
            logData.email = decoded.email
            logData.displayName = decoded.name
            logData.roles = decoded.roles
            logData.membership = decoded.membership
            logData.signInProvider = decoded.sign_in_provider
        } catch {
            logData.authError = 'Invalid session token'
        }
    } else {
        logData.authenticated = false
    }

    console.log(JSON.stringify(logData))
}
