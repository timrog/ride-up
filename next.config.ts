import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	/* config options here */
	productionBrowserSourceMaps: true,
	webpack(config, options) {
		if (options.isServer) config.devtool = 'source-map'
		return config
	},
}

export default nextConfig
