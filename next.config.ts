import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	productionBrowserSourceMaps: true,
	experimental: {
		staleTimes: {
			dynamic: 30,
		},
	},
	webpack(config, options) {
		return config
	},
}

export default nextConfig
