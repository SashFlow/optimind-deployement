import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
	absolutizeRemotes,
	toAvatarAsset,
} from "@/lib/optimodel/avatar-asset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IndexJson = {
	avatars: Array<{ id: string; dir: string; name?: string }>;
};

async function loadIndex(): Promise<IndexJson> {
	const raw = await readFile(
		join(process.cwd(), "public/spatialreal/index.json"),
		"utf8",
	);
	return JSON.parse(raw) as IndexJson;
}

/**
 * Public browser origin for absolutizing `/spatialreal/...` remotes.
 *
 * `new URL(req.url).origin` is wrong in production Docker: Next often sees
 * `http://localhost:3000` (or an internal service host) behind TLS termination,
 * so AvatarKit then tries to download models from an unreachable URL.
 *
 * Prefer forwarded headers → NEXT_PUBLIC_SITE_URL → leave path-absolute remotes.
 */
function publicOrigin(req: Request): string | null {
	const forwardedHost = req.headers
		.get("x-forwarded-host")
		?.split(",")[0]
		?.trim();
	const host = forwardedHost || req.headers.get("host")?.trim();
	const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || null;

	if (host) {
		const isInternal =
			host.startsWith("localhost") ||
			host.startsWith("127.0.0.1") ||
			host.startsWith("0.0.0.0") ||
			host.endsWith(".internal") ||
			/^[\w-]+:\d+$/.test(host); // bare docker service host:port
		// Never emit Docker-internal origins — prefer SITE_URL, else relative.
		if (isInternal) return site;

		const forwardedProto = req.headers
			.get("x-forwarded-proto")
			?.split(",")[0]
			?.trim();
		const proto = forwardedProto || "https";
		return `${proto}://${host}`;
	}

	return site;
}

export async function GET(
	req: Request,
	ctx: { params: Promise<{ id: string }> },
) {
	const { id: rawId } = await ctx.params;
	const characterId = decodeURIComponent(rawId);

	try {
		const index = await loadIndex();
		const byId = index.avatars.find((a) => a.id === characterId);
		const byName = index.avatars.find((a) => a.name === characterId);
		const entry = byId ?? byName;
		if (!entry) {
			return NextResponse.json(
				{
					errors: [
						{
							title: "avatar not found",
							detail: `No local OptiModel cache for ${characterId}`,
						},
					],
				},
				{ status: 404 },
			);
		}

		const metaPath = join(
			process.cwd(),
			"public/spatialreal",
			entry.dir,
			"character.json",
		);
		const meta = JSON.parse(await readFile(metaPath, "utf8")) as Record<
			string,
			unknown
		>;
		const asset = toAvatarAsset(meta, entry.dir);
		const origin = publicOrigin(req);
		// Path-absolute remotes (`/spatialreal/...`) resolve against the page
		// origin in the browser — safer than a wrong Docker-internal origin.
		const payload = origin ? absolutizeRemotes(asset, origin) : asset;

		return NextResponse.json(payload, {
			headers: { "Cache-Control": "no-store" },
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json(
			{
				errors: [
					{ title: "avatar load failed", detail: message },
				],
			},
			{ status: 500 },
		);
	}
}
