import { redirect } from 'next/navigation'
import { getUser } from "app/serverAuth"
import { getAdminApp } from '@/lib/firebase/serverApp'
import RefreshMembershipButton from './RefreshMembershipButton'

export default async function AdminPage() {
    const { roles } = await getUser()

    if (!roles.includes('admin')) {
        redirect('/')
    }

    const auth = getAdminApp().auth()
    const listUsersResult = await auth.listUsers()

    return (
        <div className="container px-4 sm:mx-auto my-16">
            <h1>User Management</h1>
            <div className="my-4">
                <RefreshMembershipButton />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left p-2">UID</th>
                            <th className="text-left p-2">Email</th>
                            <th className="text-left p-2">Display Name</th>
                            <th className="text-left p-2">Phone</th>
                            <th className="text-left p-2">Claims</th>
                            <th className="text-left p-2">Created</th>
                            <th className="text-left p-2">Last Sign In</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listUsersResult.users.map(user => (
                            <tr key={user.uid} className="border-b">
                                <td className="p-2 font-mono text-sm">{user.uid}</td>
                                <td className="p-2">{user.email || '-'}</td>
                                <td className="p-2">{user.displayName || '-'}</td>
                                <td className="p-2">{user.phoneNumber || '-'}</td>
                                <td className="p-2">
                                    <code className="text-sm">
                                        {
                                            JSON.stringify(user.customClaims) 
                                        }
                                    </code>
                                </td>
                                <td className="p-2 text-sm">
                                    {new Date(user.metadata.creationTime).toLocaleDateString()}
                                </td>
                                <td className="p-2 text-sm">
                                    {user.metadata.lastSignInTime ?
                                        new Date(user.metadata.lastSignInTime).toLocaleDateString() :
                                        '-'
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="mt-4 text-sm text-gray-500">
                Total users: {listUsersResult.users.length}
            </p>
        </div>
    )
}
