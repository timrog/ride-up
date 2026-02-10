import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	/* config options here */
	productionBrowserSourceMaps: true,
	webpack(config, options) {
		return config
	},
}

export default nextConfig
