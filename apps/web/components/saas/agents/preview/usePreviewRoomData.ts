"use client";

import { useRoomContext, useTranscriptions } from "@livekit/components-react";
import type { RpcInvocationData } from "livekit-client";
import { useEffect, useMemo, useState } from "react";

export type PreviewRpcCard = {
	id: string;
	method: string;
	title: string;
	subtitle?: string;
	status?: "success" | "warning" | "info";
	fields: Array<{ label: string; value: string }>;
	raw: unknown;
};

export type PreviewFileItem = {
	id: string;
	topic: string;
	name: string;
	mimeType?: string;
	size?: number;
	url: string;
	from?: string;
};

export type PreviewTextItem = {
	id: string;
	topic: string;
	text: string;
	from?: string;
	timestamp: number;
};

const BYTE_STREAM_TOPICS = [
	"files",
	"file",
	"images",
	"image",
	"agent-files",
	"agent-images",
] as const;

const RPC_METHODS = [
	"client.widget",
	"client.flashcard",
	"client.quiz",
	"client.appointment_scheduling",
	"client.reminder_calls",
	"client.patient_history",
	"client.patient_followup",
	"client.mer_call",
	"client.insurance_policy",
	"client.hospital_navigation",
	"client.health_report",
	"client.feedback_call",
	"client.discharge_assistant",
	"client.chronic_condition",
] as const;

function guessMime(name: string, mimeType?: string) {
	if (mimeType) return mimeType;
	const lower = name.toLowerCase();
	if (lower.endsWith(".png")) return "image/png";
	if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
	if (lower.endsWith(".webp")) return "image/webp";
	if (lower.endsWith(".gif")) return "image/gif";
	if (lower.endsWith(".pdf")) return "application/pdf";
	return "application/octet-stream";
}

function normalizeRpcCard(
	method: string,
	payload: Record<string, unknown>,
): PreviewRpcCard | null {
	const action = typeof payload.action === "string" ? payload.action : "";
	if (action === "clear") return null;

	if (payload.widget && typeof payload.widget === "object") {
		const widget = payload.widget as Record<string, unknown>;
		const data = Array.isArray(widget.data) ? widget.data : [];
		return {
			id: String(widget.id ?? `${method}-${Date.now()}`),
			method,
			title: String(widget.title ?? "Widget"),
			subtitle: String(widget.description ?? ""),
			status:
				widget.status === "success" || widget.status === "warning"
					? widget.status
					: "info",
			fields: data
				.filter(
					(field): field is { label: string; value: string } =>
						!!field &&
						typeof field === "object" &&
						"label" in field &&
						"value" in field,
				)
				.map((field) => ({
					label: String(field.label),
					value: String(field.value),
				})),
			raw: payload,
		};
	}

	const card =
		payload.card && typeof payload.card === "object"
			? (payload.card as Record<string, unknown>)
			: payload;
	const fields = Array.isArray(card.fields) ? card.fields : [];

	return {
		id: String(card.id ?? `${method}-${Date.now()}`),
		method,
		title: String(
			card.title ??
				(typeof payload.question === "string"
					? payload.question
					: method.replace(/^client\./, "")),
		),
		subtitle: String(
			card.subtitle ??
				(typeof payload.answer === "string" ? payload.answer : ""),
		),
		status:
			card.status === "success" || card.status === "warning"
				? card.status
				: "info",
		fields: fields
			.filter(
				(field): field is { label: string; value: string } =>
					!!field &&
					typeof field === "object" &&
					"label" in field &&
					"value" in field,
			)
			.map((field) => ({
				label: String(field.label),
				value: String(field.value),
			})),
		raw: payload,
	};
}

function useAgentTextStreams(agentName: string, agentId: string) {
	const room = useRoomContext();
	const [items, setItems] = useState<PreviewTextItem[]>([]);

	const topics = useMemo(() => {
		const values = ["lk.chat", agentName.trim(), agentId.trim()].filter(
			Boolean,
		);
		return Array.from(new Set(values));
	}, [agentId, agentName]);

	useEffect(() => {
		const handlers = topics.map((topic) => {
			const handler = async (
				reader: { readAll: () => Promise<string>; info: { id: string; timestamp: number } },
				participantInfo: { identity: string },
			) => {
				try {
					const text = await reader.readAll();
					if (!text.trim()) return;
					setItems((prev) => {
						const next = prev.filter(
							(item) => item.id !== reader.info.id,
						);
						next.push({
							id: reader.info.id,
							topic,
							text,
							from: participantInfo.identity,
							timestamp: reader.info.timestamp,
						});
						return next.sort(
							(left, right) => left.timestamp - right.timestamp,
						);
					});
				} catch {
					// Ignore malformed streams.
				}
			};
			room.registerTextStreamHandler(topic, handler);
			return topic;
		});

		return () => {
			for (const topic of handlers) {
				room.unregisterTextStreamHandler(topic);
			}
		};
	}, [room, topics]);

	return items;
}

export function usePreviewRoomData(agentName: string, agentId: string) {
	const room = useRoomContext();
	const transcriptions = useTranscriptions();
	const agentTexts = useAgentTextStreams(agentName, agentId);
	const [rpcCards, setRpcCards] = useState<PreviewRpcCard[]>([]);
	const [files, setFiles] = useState<PreviewFileItem[]>([]);

	const transcriptItems = useMemo<PreviewTextItem[]>(
		() =>
			transcriptions.map((item) => ({
				id: item.streamInfo.id,
				topic: "lk.transcription",
				text: item.text,
				from: item.participantInfo.identity,
				timestamp: item.streamInfo.timestamp,
			})),
		[transcriptions],
	);

	const messages = useMemo(() => {
		const byId = new Map<string, PreviewTextItem>();
		for (const item of [...transcriptItems, ...agentTexts]) {
			byId.set(item.id, item);
		}
		return Array.from(byId.values()).sort(
			(left, right) => left.timestamp - right.timestamp,
		);
	}, [agentTexts, transcriptItems]);

	useEffect(() => {
		const objectUrls: string[] = [];

		const onFile = async (
			reader: {
				readAll: () => Promise<Uint8Array[]>;
				info: {
					id: string;
					name: string;
					mimeType: string;
					size?: number;
				};
			},
			participantInfo: { identity: string },
			topic: string,
		) => {
			try {
				const chunks = await reader.readAll();
				const total = chunks.reduce(
					(sum, chunk) => sum + chunk.byteLength,
					0,
				);
				const bytes = new Uint8Array(total);
				let offset = 0;
				for (const chunk of chunks) {
					bytes.set(chunk, offset);
					offset += chunk.byteLength;
				}
				const name = reader.info.name || `${topic}-${reader.info.id}`;
				const mimeType = guessMime(name, reader.info.mimeType);
				const blob = new Blob([bytes], { type: mimeType });
				const url = URL.createObjectURL(blob);
				objectUrls.push(url);
				setFiles((prev) => [
					...prev.filter((file) => file.id !== reader.info.id),
					{
						id: reader.info.id,
						topic,
						name,
						mimeType,
						size: reader.info.size ?? bytes.byteLength,
						url,
						from: participantInfo.identity,
					},
				]);
			} catch {
				// Ignore malformed streams so the session UI stays usable.
			}
		};

		for (const topic of BYTE_STREAM_TOPICS) {
			room.registerByteStreamHandler(topic, (reader, info) =>
				onFile(reader, info, topic),
			);
		}

		return () => {
			for (const topic of BYTE_STREAM_TOPICS) {
				room.unregisterByteStreamHandler(topic);
			}
			for (const url of objectUrls) URL.revokeObjectURL(url);
		};
	}, [room]);

	useEffect(() => {
		const makeHandler =
			(method: string) =>
			async (data: RpcInvocationData): Promise<string> => {
				try {
					const payload = JSON.parse(data.payload) as Record<
						string,
						unknown
					>;
					if (payload.action === "clear") {
						setRpcCards((prev) =>
							prev.filter((card) => card.method !== method),
						);
						return "";
					}
					const card = normalizeRpcCard(method, payload);
					if (!card) return "";
					setRpcCards((prev) => {
						const without = prev.filter(
							(item) => item.id !== card.id,
						);
						return [...without, card];
					});
				} catch {
					setRpcCards((prev) => [
						...prev,
						{
							id: `rpc-${Date.now()}`,
							method,
							title: method,
							subtitle: data.payload,
							status: "info",
							fields: [],
							raw: data.payload,
						},
					]);
				}
				return "";
			};

		for (const method of RPC_METHODS) {
			room.registerRpcMethod(method, makeHandler(method));
		}

		return () => {
			for (const method of RPC_METHODS) {
				room.unregisterRpcMethod(method);
			}
		};
	}, [room]);

	return {
		messages,
		files,
		rpcCards,
		clearRpcCards: () => setRpcCards([]),
	};
}
