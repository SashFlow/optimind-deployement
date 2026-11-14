import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { logger } from "@repo/logs";

export type ComposeMergeInput = {
	agentPath: string;
	userPath: string;
	agentEgressNs: bigint | string | number;
	userEgressNs: bigint | string | number;
	outWav: string;
	/** When set with videoEgressNs + videoOut, muxes video. */
	videoPath?: string;
	videoEgressNs?: bigint | string | number;
	videoOut?: string;
	padS?: number;
};

export type ComposeMergeResult = {
	ok: true;
	t0Ns: string;
	sampleRate: number;
	spanS: number;
	padS: number;
	outWav: string;
	videoOut: string | null;
	trackOffsetsS: Record<string, number>;
	durationsS: Record<string, number>;
};

/** Prefer env override; else python_compose/ relative to worker cwd (dev + Docker). */
function resolveComposeScript(): string {
	const fromEnv = process.env.COMPOSE_MERGE_PY?.trim();
	if (fromEnv) {
		return fromEnv;
	}
	const candidates = [
		join(process.cwd(), "python_compose", "compose_merge.py"),
		join(
			process.cwd(),
			"apps",
			"worker",
			"python_compose",
			"compose_merge.py",
		),
		"/app/apps/worker/python_compose/compose_merge.py",
	];
	for (const path of candidates) {
		if (existsSync(path)) {
			return path;
		}
	}
	return candidates[0]!;
}

function pythonBin(): string {
	return (
		process.env.COMPOSE_MERGE_PYTHON?.trim() ||
		process.env.PYTHON?.trim() ||
		(process.platform === "win32" ? "python" : "python3")
	);
}

function nsString(value: bigint | string | number): string {
	return typeof value === "bigint" ? value.toString() : String(value);
}

function parseSummary(stdout: string): ComposeMergeResult {
	const lines = stdout
		.trim()
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter(Boolean);
	const last = lines[lines.length - 1];
	if (!last) {
		throw new Error("compose_merge produced no stdout summary");
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(last);
	} catch {
		throw new Error(
			`compose_merge invalid JSON summary: ${last.slice(0, 500)}`,
		);
	}
	const record = parsed as Record<string, unknown>;
	if (record.ok !== true) {
		throw new Error(
			typeof record.error === "string"
				? record.error
				: "compose_merge reported failure",
		);
	}
	return parsed as ComposeMergeResult;
}

/**
 * Run the Python egress-canvas merge (numpy mix + optional video mux).
 */
export async function runComposeMerge(
	input: ComposeMergeInput,
): Promise<ComposeMergeResult> {
	const script = resolveComposeScript();
	const py = pythonBin();

	if (!existsSync(script)) {
		throw new Error(`compose_merge.py not found at ${script}`);
	}

	const args = [
		script,
		"--agent",
		input.agentPath,
		"--user",
		input.userPath,
		"--agent-egress-ns",
		nsString(input.agentEgressNs),
		"--user-egress-ns",
		nsString(input.userEgressNs),
		"--out-wav",
		input.outWav,
		"--pad",
		String(input.padS ?? 0.5),
	];

	const hasVideo =
		Boolean(input.videoPath) &&
		input.videoEgressNs != null &&
		Boolean(input.videoOut);

	if (hasVideo) {
		args.push(
			"--video",
			input.videoPath!,
			"--user-video-egress-ns",
			nsString(input.videoEgressNs!),
			"--video-out",
			input.videoOut!,
		);
	} else {
		args.push("--no-video");
	}

	logger.info("Running compose_merge", {
		py,
		script,
		hasVideo,
		outWav: input.outWav,
		videoOut: input.videoOut ?? null,
	});

	return await new Promise<ComposeMergeResult>((resolve, reject) => {
		const child = spawn(py, args, {
			stdio: ["ignore", "pipe", "pipe"],
			env: process.env,
			cwd: join(script, ".."),
		});
		let stdout = "";
		let stderr = "";
		child.stdout?.on("data", (chunk: Buffer) => {
			stdout += chunk.toString("utf8");
		});
		child.stderr?.on("data", (chunk: Buffer) => {
			stderr += chunk.toString("utf8");
		});
		child.on("error", (error) => {
			reject(
				error instanceof Error &&
					(error as NodeJS.ErrnoException).code === "ENOENT"
					? new Error(`Python not found on PATH (${py})`)
					: error,
			);
		});
		child.on("close", (code) => {
			if (code !== 0) {
				const tail = stderr.trim().slice(-2000);
				reject(
					new Error(
						`compose_merge exited with code ${code}: ${tail || stdout.trim().slice(-500)}`,
					),
				);
				return;
			}
			try {
				resolve(parseSummary(stdout));
			} catch (error) {
				reject(error);
			}
		});
	});
}
