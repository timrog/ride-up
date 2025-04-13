'use client'
import { initFirebase } from '../../lib/firebase/initFirebase'
import { useEffect, useState } from 'react'
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth'
import {
    getAuth,
    GoogleAuthProvider,
    TwitterAuthProvider,
    GithubAuthProvider,
    EmailAuthProvider,
    User,
    Auth
} from "firebase/auth";
import { setUserCookie } from '../../lib/firebase/userCookies'
import { mapUserData } from '../../lib/firebase/mapUserData'
import * as firebaseui from 'firebaseui';

initFirebase()

const auth: Auth = getAuth()

const firebaseAuthConfig: firebaseui.auth.Config = {
    signInFlow: 'popup',
    // Auth providers
    // https://github.com/firebase/firebaseui-web#configure-oauth-providers
    signInOptions: [
        {
            provider: EmailAuthProvider.PROVIDER_ID,
            requireDisplayName: true,
        },
        // add additional auth flows below
        GoogleAuthProvider.PROVIDER_ID,
        TwitterAuthProvider.PROVIDER_ID,
        GithubAuthProvider.PROVIDER_ID,
    ],
    signInSuccessUrl: '/',
    credentialHelper: 'none',
    callbacks: {
        signInSuccessWithAuthResult: ({ user }, redirectUrl) => {
            const userData = mapUserData(user)
            setUserCookie(userData)
            return true
        },
    },
}

const FirebaseAuth: React.FC = () => {
    // Do not SSR FirebaseUI, because it is not supported.
    // https://github.com/firebase/firebaseui-web/issues/213
    const [renderAuth, setRenderAuth] = useState<boolean>(false)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setRenderAuth(true)
        }
    }, [])
    return (
        <div>
            {
                renderAuth ? (
                    <StyledFirebaseAuth
                        uiConfig={firebaseAuthConfig}
                        firebaseAuth={auth}
                    />
                ) : null
            }
        </div>
    )
}

export default FirebaseAuth
