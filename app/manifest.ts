import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Ride Up',
        short_name: 'VCGH',
        description: 'Sign up for rides',
        start_url: '/',
        display: 'standalone',
        background_color: 'rgb(0, 91, 156)',
        theme_color: '#000000',
        icons: [
            {
                src: '/app-icon.png',
                sizes: '192x192',
                type: 'image/png',
            }
        ],
    }
}