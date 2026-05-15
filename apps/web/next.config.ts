import { withContentCollections } from "@content-collections/next";
// @ts-expect-error - PrismaPlugin is not typed
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";
import type { NextConfig } from "next";
import nextIntlPlugin from "next-intl/plugin";

const withNextIntl = nextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
	output: "standalone",
	transpilePackages: [
		"@repo/api",
		"@repo/auth",
		"@repo/database",
		"@repo/utils",
		"@repo/i18n",
		"@repo/mail",
		"@repo/payments",
		"@repo/storage",
		"@repo/ui",
		"@repo/ai",
		"@repo/logs",
	],
	images: {
		remotePatterns: [
			{
				// google profile images
				protocol: "https",
				hostname: "lh3.googleusercontent.com",
			},
			{
				// github profile images
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
			},
			{
				// unsplash images
				protocol: "https",
				hostname: "images.unsplash.com",
			},
			{
				// placeholder images
				protocol: "https",
				hostname: "picsum.photos",
			},
			{
				// aceternity images
				protocol: "https",
				hostname: "assets.aceternity.com",
			},
		],
	},
	async redirects() {
		return [
			{
				source: "/app",
				destination: "/app/playground",
				permanent: true,
			},
		];
	},
	webpack: (config, { webpack, isServer }) => {
		config.plugins.push(
			new webpack.IgnorePlugin({
				resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
			}),
		);

		if (isServer) {
			config.plugins.push(new PrismaPlugin());
		}

		return config;
	},
};

export default withContentCollections(withNextIntl(nextConfig));
