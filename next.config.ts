import type { NextConfig } from "next"

const nextConfig: NextConfig = {
	productionBrowserSourceMaps: true,
	outputFileTracingRoot: process.cwd(),
	experimental: {
		staleTimes: {
			dynamic: 30,
		},
	},
	webpack(config, options) {
		config.ignoreWarnings = [
			...(config.ignoreWarnings ?? []),
			{
				module: /@opentelemetry\/instrumentation/,
				message: /Critical dependency: the request of a dependency is an expression/,
			},
			{
				module: /@protobufjs\/inquire/,
				message: /Critical dependency: the request of a dependency is an expression/,
			},
		]
		return config
	},
}

export default nextConfig
