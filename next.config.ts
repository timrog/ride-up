import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	productionBrowserSourceMaps: true,
	experimental: {
		staleTimes: {
			dynamic: 30,
		},
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "Cache-Control",
						value: "public, s-maxage=3600, stale-while-revalidate=86400",
					},
				],
			},
			{
				source: "/api/calendar/feed",
				headers: [
					{
						key: "Cache-Control",
						value: "public, s-maxage=3600, stale-while-revalidate=86400",
					},
				],
			},
		]
	},
	webpack(config, options) {
		return config
	},
}

export default nextConfig
