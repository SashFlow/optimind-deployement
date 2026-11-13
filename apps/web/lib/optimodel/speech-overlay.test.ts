/**
 * Additive speech-neck composite checks (no DOM).
 * Run with: npx tsx apps/web/lib/optimodel/speech-overlay.test.ts
 */
import { zeroKeyframe } from "@repo/arkit-flame";
import {
	DEFAULT_NECK_SCALE,
	applySpeechOverlay,
	speechOverlayFromFlame,
	speechOverlayFromIdle,
} from "./speech-overlay";

function assert(cond: unknown, msg: string): void {
	if (!cond) throw new Error(msg);
}

function assertClose(a: number, b: number, eps: number, msg: string): void {
	if (Math.abs(a - b) > eps) {
		throw new Error(`${msg}: got ${a}, expected ${b} (±${eps})`);
	}
}

const restNeck: [number, number, number] = [0.09, -0.006, -0.004];

function makeIdle() {
	const idle = zeroKeyframe();
	idle.neckPose = [0.08, 0.012, -0.04];
	idle.jawPose = [0.02, 0, 0];
	idle.expression[0] = 1;
	return idle;
}

{
	const idle = makeIdle();
	const speech = speechOverlayFromFlame(idle);
	speech.expression = Array.from({ length: 100 }, () => 0);
	speech.expression[1] = 0.5;
	speech.jawPose = [0.05, 0, 0];
	speech.neckPose = [...restNeck];

	const out = applySpeechOverlay(idle, speech, {
		neckScale: DEFAULT_NECK_SCALE,
		restNeck,
	});
	assertClose(
		out.neckPose[0],
		idle.neckPose[0],
		1e-9,
		"rest speech keeps idle neck[0]",
	);
	assertClose(
		out.neckPose[1],
		idle.neckPose[1],
		1e-9,
		"rest speech keeps idle neck[1]",
	);
	assertClose(
		out.neckPose[2],
		idle.neckPose[2],
		1e-9,
		"rest speech keeps idle neck[2]",
	);
	assertClose(out.jawPose[0], 0.05, 1e-9, "jaw still replaced");
	assertClose(out.expression[1], 0.5, 1e-9, "expression still replaced");
	assertClose(out.expression[0], 0, 1e-9, "idle expression cleared");
}

{
	const idle = makeIdle();
	const delta: [number, number, number] = [0.01, -0.002, 0.003];
	const speechNeck: [number, number, number] = [
		restNeck[0] + delta[0],
		restNeck[1] + delta[1],
		restNeck[2] + delta[2],
	];
	const speech = speechOverlayFromFlame(idle);
	speech.neckPose = speechNeck;
	speech.jawPose = [0.04, 0, 0];

	const scale = 2;
	const out = applySpeechOverlay(idle, speech, {
		neckScale: scale,
		restNeck,
	});
	assertClose(
		out.neckPose[0],
		idle.neckPose[0] + scale * delta[0],
		1e-9,
		"additive neck[0]",
	);
	assertClose(
		out.neckPose[1],
		idle.neckPose[1] + scale * delta[1],
		1e-9,
		"additive neck[1]",
	);
	assertClose(
		out.neckPose[2],
		idle.neckPose[2] + scale * delta[2],
		1e-9,
		"additive neck[2]",
	);
}

{
	const idle = makeIdle();
	const speech = speechOverlayFromFlame(idle, { includeNeck: false });
	assert(speech.neckPose === undefined, "includeNeck false omits neck");
	const out = applySpeechOverlay(idle, speech, {
		neckScale: DEFAULT_NECK_SCALE,
		restNeck,
	});
	assertClose(
		out.neckPose[0],
		idle.neckPose[0],
		1e-9,
		"omitted neck leaves idle",
	);
}

{
	const idle = makeIdle();
	const overlay = speechOverlayFromIdle(idle, restNeck);
	assertClose(
		overlay.neckPose![0],
		restNeck[0],
		1e-9,
		"idle overlay neck is rest[0]",
	);
	assertClose(
		overlay.jawPose[0],
		idle.jawPose[0],
		1e-9,
		"idle overlay keeps jaw",
	);
	const out = applySpeechOverlay(idle, overlay, {
		neckScale: DEFAULT_NECK_SCALE,
		restNeck,
	});
	assertClose(
		out.neckPose[0],
		idle.neckPose[0],
		1e-9,
		"zero-delta idle overlay preserves idle neck",
	);
}

{
	const idleA = makeIdle();
	const idleB = makeIdle();
	idleB.neckPose = [0.1, -0.01, 0.02];
	const speech = speechOverlayFromFlame(idleA);
	speech.neckPose = [...restNeck];
	const a = applySpeechOverlay(idleA, speech, {
		neckScale: DEFAULT_NECK_SCALE,
		restNeck,
	});
	const b = applySpeechOverlay(idleB, speech, {
		neckScale: DEFAULT_NECK_SCALE,
		restNeck,
	});
	assertClose(
		a.neckPose[0],
		idleA.neckPose[0],
		1e-9,
		"frame A tracks idle A",
	);
	assertClose(
		b.neckPose[0],
		idleB.neckPose[0],
		1e-9,
		"frame B tracks idle B",
	);
	assert(
		Math.abs(a.neckPose[0] - b.neckPose[0]) > 1e-6,
		"near-rest speech still follows idle frame-to-frame",
	);
}

console.log("speech-overlay.test.ts: ok");
