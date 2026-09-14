import type { LucideIcon } from "lucide-react";
import {
	BookOpen,
	Bot,
	Box,
	CalendarClock,
	Cloud,
	Code2,
	Cpu,
	Database,
	Flag,
	GitBranch,
	Globe,
	Infinity as InfinityIcon,
	UserCheck,
	Webhook,
} from "lucide-react";

export type CatalogTab = "Nodes" | "Start" | "AI" | "Tools";

export type CatalogItem = {
	type: string;
	label: string;
	description: string;
	defaultConfig: Record<string, unknown>;
	icon: LucideIcon;
	/** Tailwind bg class for the icon chip */
	iconBg: string;
	/** Hex used for accents / handles when needed */
	iconColor: string;
};

export type CatalogGroup = {
	category: string;
	/** Which Add-Node tabs show this group */
	tabs: CatalogTab[];
	items: CatalogItem[];
};

export const WORKFLOW_NODE_CATALOG: CatalogGroup[] = [
	{
		category: "Start",
		tabs: ["Nodes", "Start"],
		items: [
			{
				type: "start.webhook",
				label: "Webhook",
				description: "Start on HTTP webhook",
				defaultConfig: {},
				icon: Webhook,
				iconBg: "bg-emerald-500",
				iconColor: "#10b981",
			},
			{
				type: "start.scheduled",
				label: "Scheduled",
				description: "Start on cron schedule",
				defaultConfig: { cron: "0 * * * *" },
				icon: CalendarClock,
				iconBg: "bg-teal-500",
				iconColor: "#14b8a6",
			},
		],
	},
	{
		category: "AI",
		tabs: ["Nodes", "AI"],
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
				icon: Bot,
				iconBg: "bg-violet-500",
				iconColor: "#8b5cf6",
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
				icon: Cpu,
				iconBg: "bg-blue-600",
				iconColor: "#2563eb",
			},
		],
	},
	{
		category: "Logic",
		tabs: ["Nodes", "Tools"],
		items: [
			{
				type: "control.if",
				label: "IF / ELSE",
				description: "Branch on condition",
				defaultConfig: {
					cases: [{ handle: "true", expression: "" }],
				},
				icon: GitBranch,
				iconBg: "bg-cyan-500",
				iconColor: "#06b6d4",
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
				icon: InfinityIcon,
				iconBg: "bg-teal-600",
				iconColor: "#0d9488",
			},
		],
	},
	{
		category: "Tools",
		tabs: ["Nodes", "Tools"],
		items: [
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
				icon: Globe,
				iconBg: "bg-sky-500",
				iconColor: "#0ea5e9",
			},
			{
				type: "code.js",
				label: "Code",
				description: "Run sandboxed JavaScript",
				defaultConfig: {
					code: "return { result: context.trigger };",
					timeoutMs: 5000,
				},
				icon: Code2,
				iconBg: "bg-blue-500",
				iconColor: "#3b82f6",
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
				icon: UserCheck,
				iconBg: "bg-indigo-400",
				iconColor: "#818cf8",
			},
			{
				type: "knowledge.retrieve",
				label: "Knowledge Retrieval",
				description: "Search campaign knowledge bases",
				defaultConfig: { query: "", k: 5 },
				icon: BookOpen,
				iconBg: "bg-green-500",
				iconColor: "#22c55e",
			},
		],
	},
	{
		category: "Data",
		tabs: ["Nodes", "Tools"],
		items: [
			{
				type: "storage.s3",
				label: "S3",
				description: "Read/write S3 objects",
				defaultConfig: { operation: "read", bucket: "", key: "" },
				icon: Cloud,
				iconBg: "bg-orange-500",
				iconColor: "#f97316",
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
				icon: Box,
				iconBg: "bg-sky-600",
				iconColor: "#0284c7",
			},
			{
				type: "storage.gcp",
				label: "GCP Storage",
				description: "Read/write GCS objects",
				defaultConfig: { operation: "read", bucket: "", key: "" },
				icon: Database,
				iconBg: "bg-amber-500",
				iconColor: "#f59e0b",
			},
		],
	},
	{
		category: "End",
		tabs: ["Nodes", "Start"],
		items: [
			{
				type: "end",
				label: "End",
				description: "Finish the workflow",
				defaultConfig: {},
				icon: Flag,
				iconBg: "bg-orange-600",
				iconColor: "#ea580c",
			},
		],
	},
];

export type CatalogNodeType =
	(typeof WORKFLOW_NODE_CATALOG)[number]["items"][number]["type"];

const ITEM_BY_TYPE = new Map<string, CatalogItem>();
for (const group of WORKFLOW_NODE_CATALOG) {
	for (const item of group.items) {
		ITEM_BY_TYPE.set(item.type, item);
	}
}

export function getCatalogItem(type: string): CatalogItem | undefined {
	return ITEM_BY_TYPE.get(type);
}

export function filterCatalog(tab: CatalogTab, query: string): CatalogGroup[] {
	const q = query.trim().toLowerCase();
	return WORKFLOW_NODE_CATALOG.map((group) => {
		if (tab !== "Nodes" && !group.tabs.includes(tab)) {
			return { ...group, items: [] };
		}
		const items = group.items.filter((item) => {
			if (!q) {
				return true;
			}
			return (
				item.label.toLowerCase().includes(q) ||
				item.type.toLowerCase().includes(q) ||
				item.description.toLowerCase().includes(q) ||
				group.category.toLowerCase().includes(q)
			);
		});
		return { ...group, items };
	}).filter((g) => g.items.length > 0);
}

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
