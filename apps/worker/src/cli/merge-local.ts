/**
 * Local track-merge CLI (no BullMQ). Writes merged output under --out.
 *
 *   pnpm --filter @repo/worker merge:local -- --session <sessionId> [--out <dir>]
 *   pnpm --filter @repo/worker merge:local -- --session <sessionId> --upload
 */

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getAgentSessionById } from "@repo/database";
import { logger } from "@repo/logs";
import { runTrackMerge } from "../handlers/merge-tracks";

function usage(): never {
	console.error(`Usage:
  pnpm --filter @repo/worker merge:local -- --session <sessionId> [options]

Options:
  --session <id>   Agent session id (required)
  --out <dir>      Output directory (default: out/<sessionId>)
  --upload         Also upload composite to recordings bucket
`);
	process.exit(2);
}

function parseArgs(argv: string[]) {
	let sessionId: string | undefined;
	let outDir: string | undefined;
	let upload = false;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--session") {
			sessionId = argv[++i];
		} else if (arg === "--out") {
			outDir = argv[++i];
		} else if (arg === "--upload") {
			upload = true;
		} else if (arg === "--help" || arg === "-h") {
			usage();
		} else {
			console.error(`Unknown argument: ${arg}`);
			usage();
		}
	}

	if (!sessionId?.trim()) {
		usage();
	}

	return {
		sessionId: sessionId.trim(),
		outDir,
		upload,
	};
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const session = await getAgentSessionById(args.sessionId);
	if (!session) {
		throw new Error(`Session not found: ${args.sessionId}`);
	}

	const outDir =
		args.outDir?.trim() || join(process.cwd(), "out", args.sessionId);
	await mkdir(outDir, { recursive: true });

	logger.info("merge:local starting", {
		sessionId: args.sessionId,
		organizationId: session.organizationId,
		outDir,
		upload: args.upload,
	});

	const result = await runTrackMerge({
		sessionId: args.sessionId,
		organizationId: session.organizationId,
		workDir: outDir,
		keepLocalFiles: true,
		upload: args.upload,
		persistJob: false,
	});

	console.log(
		JSON.stringify(
			{
				ok: true,
				outputPath: result.outputPath,
				outputKey: result.outputKey,
				roomName: result.roomName,
				uploaded: result.uploaded,
				sizeBytes: result.sizeBytes,
				trackOffsetsS: result.trackOffsetsS,
				diagnostics: join(outDir, "merge_diagnostics.json"),
			},
			null,
			2,
		),
	);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
