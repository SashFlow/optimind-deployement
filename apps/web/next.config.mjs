import { withContentCollections } from "@content-collections/next";
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";
// withAvatarkit copies the SpatialReal WASM into public/_avatarkit and rewrites
// the Emscripten scriptDirectory that bundlers otherwise break, for both
// Turbopack and webpack. The package is ESM-only (its exports map has no
// "require" condition), which is why this config is .mjs rather than .ts —
// Next loads a .ts config as CommonJS and the subpath fails to resolve.
import { withAvatarkit } from "@spatialwalk/avatarkit/next";
import nextIntlPlugin from "next-intl/plugin";

const withNextIntl = nextIntlPlugin("./i18n/request.ts");

/** @type {import("next").NextConfig} */
const nextConfig = {
	output: "standalone",
	serverExternalPackages: [
		"@aws-sdk/client-s3",
		"@aws-sdk/s3-request-presigner",
		"fast-xml-parser",
		"pdf-parse",
		"strnum",
	],
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
			{
				// tweakcn images
				protocol: "https",
				hostname: "tweakcn.com",
			},
		],
	},
	async redirects() {
		return [
			{
				source: "/app",
				destination: "/app/dashboard",
				permanent: false,
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

// withAvatarkit must wrap the config directly so its webpack hook chains into
// the one above rather than replacing it.
export default withContentCollections(withNextIntl(withAvatarkit(nextConfig)));
