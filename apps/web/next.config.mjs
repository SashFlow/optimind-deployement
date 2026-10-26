import { withContentCollections } from "@content-collections/next";
import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";
// withSpatialReal copies the SpatialReal WASM into public/_spatialreal and
// rewrites the Emscripten scriptDirectory that bundlers otherwise break, for
// both Turbopack and webpack. The package is ESM-only (its exports map has no
// "require" condition), which is why this config is .mjs rather than .ts —
// Next loads a .ts config as CommonJS and the subpath fails to resolve.
import { withSpatialReal } from "@spatialreal/web-sdk/next";
import { withAvatarkit } from "@spatius/avatarkit/next";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import nextIntlPlugin from "next-intl/plugin";

const withNextIntl = nextIntlPlugin("./i18n/request.ts");

const configDir = dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
	// output: "standalone",
	serverExternalPackages: [
		"@aws-sdk/client-s3",
		"@aws-sdk/s3-request-presigner",
		"bullmq",
		"fast-xml-parser",
		"ioredis",
		"pdf-parse",
		"strnum",
	],
	transpilePackages: [
		"@repo/api",
		"@repo/arkit-flame",
		"@repo/auth",
		"@repo/database",
		"@repo/jobs",
		"@repo/utils",
		"@repo/i18n",
		"@repo/mail",
		"@repo/payments",
		"@repo/storage",
		"@repo/ui",
		"@repo/logs",
		"@repo/livekit",
		"@myned-ai/gsplat-flame-avatar-renderer",
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
	/**
	 * SharedArrayBuffer / WASM threads for `@myned-ai/gsplat-flame-avatar-renderer`
	 * require cross-origin isolation (same as the avatar Vite app).
	 * Scoped to session surfaces so marketing pages keep third-party embeds.
	 */
	async headers() {
		const isolation = [
			{ key: "Cross-Origin-Opener-Policy", value: "same-origin" },
			{ key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
		];
		const corp = [
			{
				key: "Cross-Origin-Resource-Policy",
				value: "same-origin",
			},
		];
		return [
			{ source: "/app/:path*", headers: isolation },
			{ source: "/share/:path*", headers: isolation },
			{ source: "/embed/:path*", headers: isolation },
			// COEP require-corp needs CORP on every subresource (WASM, workers,
			// chunks, model packs) — missing headers block OptiModel in Firefox
			// and break Workers under Chrome when isolation is on.
			{ source: "/_next/static/:path*", headers: corp },
			{ source: "/_avatarkit/:path*", headers: corp },
			{ source: "/_spatialreal/:path*", headers: corp },
			{ source: "/assets/:path*", headers: corp },
			{ source: "/gsplat/:path*", headers: corp },
			{ source: "/spatialreal/:path*", headers: corp },
			{ source: "/spatialreal-api/:path*", headers: corp },
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

/**
 * withAvatarkit and withSpatialReal both register the same Turbopack/webpack
 * glob for `avatar_core_wasm*.js`. The outer wrapper wins, so SpatialReal's
 * glue is rewritten to `/_avatarkit/` and then 404s on a fresh build (that
 * folder only gets Spatius's WASM hash). Scope each loader to its package.
 */
function fixAvatarWasmLoaders(config) {
	const spatialRealLoader = join(
		configDir,
		"node_modules/@spatialreal/web-sdk/.cache/wasm-script-dir-loader.cjs",
	);
	const spatiumLoader = join(
		configDir,
		"node_modules/@spatius/avatarkit/.cache/wasm-script-dir-loader.cjs",
	);

	const turbopackRules = { ...(config.turbopack?.rules ?? {}) };
	delete turbopackRules["**/avatar_core_wasm*.js"];
	if (existsSync(spatialRealLoader)) {
		turbopackRules["**/node_modules/@spatialreal/**/avatar_core_wasm*.js"] =
			{
				loaders: [spatialRealLoader],
				as: "*.js",
			};
	}
	if (existsSync(spatiumLoader)) {
		turbopackRules["**/node_modules/@spatius/**/avatar_core_wasm*.js"] = {
			loaders: [spatiumLoader],
			as: "*.js",
		};
	}

	const prevWebpack = config.webpack;

	return {
		...config,
		turbopack: {
			...config.turbopack,
			rules: turbopackRules,
		},
		webpack: (webpackConfig, context) => {
			const resolved =
				typeof prevWebpack === "function"
					? prevWebpack(webpackConfig, context)
					: webpackConfig;

			resolved.module.rules = (resolved.module.rules ?? []).filter(
				(rule) =>
					!(
						rule?.enforce === "pre" &&
						rule.test instanceof RegExp &&
						rule.test.source === "avatar_core_wasm.*\\.js$" &&
						!rule.include
					),
			);

			if (existsSync(spatialRealLoader)) {
				resolved.module.rules.push({
					test: /avatar_core_wasm.*\.js$/,
					include: /[\\/]node_modules[\\/]@spatialreal[\\/]/,
					enforce: "pre",
					use: [{ loader: spatialRealLoader }],
				});
			}
			if (existsSync(spatiumLoader)) {
				resolved.module.rules.push({
					test: /avatar_core_wasm.*\.js$/,
					include: /[\\/]node_modules[\\/]@spatius[\\/]/,
					enforce: "pre",
					use: [{ loader: spatiumLoader }],
				});
			}

			return resolved;
		},
	};
}

/** Client preload reads this so WASM loads from /_spatialreal instead of a 1.3MB data: URL. */
function writeSpatialRealWasmManifest() {
	const dir = join(configDir, "public/_spatialreal");
	if (!existsSync(dir)) {
		return;
	}
	const wasm = readdirSync(dir).find(
		(file) => file.startsWith("avatar_core_wasm") && file.endsWith(".wasm"),
	);
	if (!wasm) {
		return;
	}
	writeFileSync(join(dir, "manifest.json"), JSON.stringify({ wasm }));
}

// withAvatarkit / withSpatialReal wrap the config so WASM assets land under
// /_avatarkit and /_spatialreal. Outer wrappers chain webpack/headers correctly.
const withAvatarPlugins = fixAvatarWasmLoaders(
	withAvatarkit(withSpatialReal(nextConfig)),
);
writeSpatialRealWasmManifest();

export default withContentCollections(withNextIntl(withAvatarPlugins));
