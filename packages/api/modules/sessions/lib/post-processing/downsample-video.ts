import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logger } from "@repo/logs";
import type { MediaPart } from "./types";

const FFMPEG_TIMEOUT_MS = 120_000;

function runFfmpeg(args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn("ffmpeg", args, {
			stdio: ["ignore", "ignore", "pipe"],
			windowsHide: true,
		});
		const stderrChunks: Buffer[] = [];
		child.stderr?.on("data", (chunk: Buffer | string) => {
			stderrChunks.push(
				Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk),
			);
		});
		const timer = setTimeout(() => {
			child.kill("SIGKILL");
			reject(new Error(`ffmpeg timed out after ${FFMPEG_TIMEOUT_MS}ms`));
		}, FFMPEG_TIMEOUT_MS);
		child.on("error", (error) => {
			clearTimeout(timer);
			reject(error);
		});
		child.on("close", (code) => {
			clearTimeout(timer);
			if (code === 0) {
				resolve();
				return;
			}
			const stderr = Buffer.concat(stderrChunks)
				.toString("utf8")
				.trim()
				.slice(-800);
			reject(
				new Error(
					`ffmpeg exited with code ${code}${stderr ? `: ${stderr}` : ""}`,
				),
			);
		});
	});
}

function isVideoMime(mimeType: string): boolean {
	return mimeType.toLowerCase().startsWith("video/");
}

/**
 * Re-encode video to 1 fps (keeping low-bitrate mono audio) before Gemini.
 * Returns the original part unchanged for non-video media, or when ffmpeg fails.
 */
export async function downsampleVideoForGemini(
	part: MediaPart,
): Promise<MediaPart> {
	if (!isVideoMime(part.mimeType || "")) {
		return part;
	}
	if (part.bytes.byteLength === 0) {
		return part;
	}

	const workDir = await mkdtemp(join(tmpdir(), "gemini-vid-"));
	const inputPath = join(workDir, "input.bin");
	const outputPath = join(workDir, "output.mp4");

	try {
		await writeFile(inputPath, part.bytes);
		await runFfmpeg([
			"-hide_banner",
			"-loglevel",
			"error",
			"-y",
			"-i",
			inputPath,
			"-map",
			"0:v:0",
			"-map",
			"0:a:0?",
			"-vf",
			"fps=1",
			"-c:v",
			"libx264",
			"-preset",
			"veryfast",
			"-crf",
			"28",
			"-c:a",
			"aac",
			"-b:a",
			"48k",
			"-ac",
			"1",
			"-ar",
			"16000",
			"-movflags",
			"+faststart",
			outputPath,
		]);
		const bytes = await readFile(outputPath);
		if (bytes.byteLength === 0) {
			logger.warn("ffmpeg produced empty 1fps video; using original");
			return part;
		}
		logger.info("Downsampled video to 1fps for Gemini", {
			inputBytes: part.bytes.byteLength,
			outputBytes: bytes.byteLength,
		});
		return { mimeType: "video/mp4", bytes };
	} catch (error) {
		logger.warn("Failed to downsample video to 1fps; using original", {
			error,
			inputBytes: part.bytes.byteLength,
			mimeType: part.mimeType,
		});
		return part;
	} finally {
		await rm(workDir, { recursive: true, force: true }).catch(() => {});
	}
}

export async function downsampleMediaForGemini(
	media: MediaPart[],
): Promise<MediaPart[]> {
	const prepared: MediaPart[] = [];
	for (const part of media) {
		prepared.push(await downsampleVideoForGemini(part));
	}
	return prepared;
}
