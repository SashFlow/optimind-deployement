import { SpatiusLocalReplayPlayer } from "@/components/demo/SpatiusLocalReplayPlayer";

export const dynamic = "force-dynamic";

const DEFAULT_AVATAR_ID = "f0c7f7b2-2f47-4622-bc3f-4b54c0904fb9";
const DEFAULT_CLIP = "expressive";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined, fallback: string): string {
	if (Array.isArray(value)) {
		return value[0]?.trim() || fallback;
	}
	return value?.trim() || fallback;
}

export default async function SpatiusReplayDemoPage({
	searchParams,
}: {
	searchParams: SearchParams;
}) {
	const params = await searchParams;
	const appId = process.env.SPATIUS_APP_ID?.trim() || "";
	const avatarId = first(params.avatarId, DEFAULT_AVATAR_ID);
	const clip = first(params.clip, DEFAULT_CLIP);

	if (!appId) {
		return (
			<main className="flex min-h-[100dvh] items-center justify-center bg-zinc-950 px-6 text-center text-white">
				<div className="max-w-md space-y-2">
					<h1 className="text-lg font-medium">Spatius local replay</h1>
					<p className="text-sm text-white/60">
						Set <code className="text-white/80">SPATIUS_APP_ID</code> in
						the web environment, then stage a distill run under{" "}
						<code className="text-white/80">
							public/spatius-replay/&lt;avatarId&gt;/&lt;clip&gt;/
						</code>
						.
					</p>
				</div>
			</main>
		);
	}

	return (
		<main className="min-h-[100dvh]">
			<SpatiusLocalReplayPlayer
				appId={appId}
				avatarId={avatarId}
				clip={clip}
			/>
		</main>
	);
}
