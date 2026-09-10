export const WORKFLOW_NODE_CATALOG = [
	{
		category: "Start",
		items: [
			{
				type: "start.webhook",
				label: "Webhook",
				description: "Start on HTTP webhook",
				defaultConfig: {},
			},
			{
				type: "start.scheduled",
				label: "Scheduled",
				description: "Start on cron schedule",
				defaultConfig: { cron: "0 * * * *" },
			},
		],
	},
	{
		category: "Blocks",
		items: [
			{
				type: "control.if",
				label: "If / Else",
				description: "Branch on condition",
				defaultConfig: {
					cases: [{ handle: "true", expression: "" }],
				},
			},
			{
				type: "control.loop",
				label: "Loop",
				description: "Iterate over items",
				defaultConfig: {
					mode: "forEach",
					itemsPath: "",
					maxIterations: 100,
				},
			},
			{
				type: "http.request",
				label: "HTTP",
				description: "Outbound HTTP request",
				defaultConfig: {
					method: "GET",
					url: "",
					headers: {},
					timeoutMs: 30000,
				},
			},
			{
				type: "code.js",
				label: "Code (JS)",
				description: "Run sandboxed JavaScript",
				defaultConfig: {
					code: "return { result: context.trigger };",
					timeoutMs: 5000,
				},
			},
			{
				type: "human.approval",
				label: "Human Approval",
				description: "Wait for web or email approval",
				defaultConfig: {
					channel: "WEB",
					message: "Please approve this step",
					expiresInHours: 72,
				},
			},
			{
				type: "knowledge.retrieve",
				label: "Knowledge Retrieval",
				description: "Search campaign knowledge bases",
				defaultConfig: { query: "", k: 5 },
			},
		],
	},
	{
		category: "AI",
		items: [
			{
				type: "ai.agent",
				label: "Agent",
				description: "Queue voice/avatar agent task",
				defaultConfig: {
					modality: "voice",
					channel: "WEB",
					direction: "OUTBOUND",
				},
			},
			{
				type: "ai.llm",
				label: "LLM",
				description: "Chat completion",
				defaultConfig: {
					model: "gpt-4o-mini",
					prompt: "",
					temperature: 0.7,
				},
			},
		],
	},
	{
		category: "Data",
		items: [
			{
				type: "storage.s3",
				label: "S3",
				description: "Read/write S3 objects",
				defaultConfig: { operation: "read", bucket: "", key: "" },
			},
			{
				type: "storage.azure",
				label: "Azure Blob",
				description: "Read/write Azure blobs",
				defaultConfig: {
					operation: "read",
					accountName: "",
					container: "",
					key: "",
				},
			},
			{
				type: "storage.gcp",
				label: "GCP Storage",
				description: "Read/write GCS objects",
				defaultConfig: { operation: "read", bucket: "", key: "" },
			},
		],
	},
	{
		category: "End",
		items: [
			{
				type: "end",
				label: "End",
				description: "Finish the workflow",
				defaultConfig: {},
			},
		],
	},
] as const;

export type CatalogNodeType =
	(typeof WORKFLOW_NODE_CATALOG)[number]["items"][number]["type"];

export const NODE_OUTPUT_HINTS: Record<string, string[]> = {
	"start.webhook": ["body", "headers", "query", "receivedAt"],
	"start.scheduled": ["scheduledAt", "cron"],
	"control.if": ["matched"],
	"control.loop": ["index", "item", "iterations"],
	"http.request": ["status", "ok", "headers", "body"],
	"code.js": ["result"],
	"human.approval": ["decision", "approved", "webUrl"],
	"knowledge.retrieve": ["query", "chunks", "text"],
	"ai.agent": [
		"sessionId",
		"status",
		"participantDetails",
		"sessionReport",
		"egressLink",
	],
	"ai.llm": ["text", "model", "usage"],
	"storage.s3": ["operation", "content", "keys", "bucket", "key"],
	"storage.azure": ["operation", "content", "container", "blob"],
	"storage.gcp": ["operation", "content", "bucket", "object"],
	end: ["summary", "finishedAt"],
};
