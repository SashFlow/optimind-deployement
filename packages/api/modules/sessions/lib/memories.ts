import { db, getAgentSessionById, setEndUserMemory } from "@repo/database";
import { logger } from "@repo/logs";
import { getOpenAIClient } from "../../knowledge/lib/embeddings";

const MEMORY_MODEL = "gpt-4o-mini";
const MAX_MEMORIES = 50;
const MAX_MEMORY_CHARS = 200;
const MAX_TRANSCRIPT_CHARS = 60_000;

const SYSTEM_PROMPT = `You maintain long-term memory about one end user of a voice agent.
You get the user's existing memories and the transcript of their latest conversation.
Return the updated memory list as JSON: {"memories": string[]}.
- Keep durable facts only: identity details, preferences, needs, decisions, commitments, follow-ups.
- Drop small talk and anything only relevant to that one call.
- Merge duplicates, update facts that changed, keep still-valid existing memories.
- Each memory is one short third-person sentence about the user.
- At most ${MAX_MEMORIES} memories, most important first.`;

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function transcriptText(
	session: NonNullable<Awaited<ReturnType<typeof getAgentSessionById>>>,
) {
	const segments = session.transcript?.segments ?? [];
	const text =
		segments.length > 0
			? segments
					.filter((s) => s.role === "USER" || s.role === "ASSISTANT")
					.map(
						(s) =>
							`${s.role === "USER" ? "User" : "Agent"}: ${s.text}`,
					)
					.join("\n")
			: (session.transcript?.fullText ?? "");
	return text.trim().slice(-MAX_TRANSCRIPT_CHARS);
}

function parseMemories(raw: string | null | undefined): string[] | null {
	try {
		const parsed = JSON.parse(raw ?? "") as { memories?: unknown };
		if (!Array.isArray(parsed.memories)) {
			return null;
		}
		const seen = new Set<string>();
		const memories: string[] = [];
		for (const item of parsed.memories) {
			if (typeof item !== "string") {
				continue;
			}
			const memory = item.trim().slice(0, MAX_MEMORY_CHARS);
			const key = memory.toLowerCase();
			if (memory && !seen.has(key)) {
				seen.add(key);
				memories.push(memory);
			}
		}
		return memories.slice(0, MAX_MEMORIES);
	} catch {
		return null;
	}
}

/**
 * Update the session's end-user memories from its transcript.
 * Idempotent per session (`metadata.memoriesGeneratedAt`); best-effort.
 */
export async function generateEndUserMemories(sessionId: string) {
	if (!process.env.OPENAI_API_KEY) {
		return;
	}
	const session = await getAgentSessionById(sessionId);
	const metadata = asRecord(session?.metadata);
	if (!session?.endUser || metadata.memoriesGeneratedAt) {
		return;
	}
	const modalities = asRecord(
		asRecord(session.configSnapshot).session_modalities,
	);
	// Missing flag keeps prior always-on behavior for older agent configs.
	if (modalities.memory === false) {
		return;
	}
	const transcript = transcriptText(session);
	if (!transcript) {
		return;
	}

	const completion = await getOpenAIClient().chat.completions.create({
		model: MEMORY_MODEL,
		temperature: 0.2,
		response_format: { type: "json_object" },
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{
				role: "user",
				content: JSON.stringify({
					user: session.endUser.name,
					existing_memories: session.endUser.memory,
					transcript,
				}),
			},
		],
	});
	const memories = parseMemories(completion.choices[0]?.message?.content);
	if (!memories) {
		logger.warn("Memory generation returned invalid JSON", { sessionId });
		return;
	}

	await setEndUserMemory(session.endUser.id, memories);
	await db.agentSession.update({
		where: { id: session.id },
		data: {
			metadata: {
				...metadata,
				memoriesGeneratedAt: new Date().toISOString(),
			},
		},
	});
}

/** Fire from session-end hooks; never throws. */
export async function generateEndUserMemoriesSafe(sessionId: string) {
	try {
		await generateEndUserMemories(sessionId);
	} catch (error) {
		logger.error("Failed to generate end-user memories", {
			sessionId,
			error,
		});
	}
}
