import { z } from "zod";

export const NODE_TYPES = [
	"start.webhook",
	"start.scheduled",
	"control.if",
	"control.loop",
	"http.request",
	"code.js",
	"human.approval",
	"knowledge.retrieve",
	"ai.agent",
	"ai.llm",
	"storage.s3",
	"storage.azure",
	"storage.gcp",
	"end",
] as const;

export type WorkflowNodeType = (typeof NODE_TYPES)[number];

export const workflowEnvVarSchema = z.object({
	key: z.string().min(1),
	value: z.string(),
	isSecret: z.boolean().optional(),
});

export const workflowNodeDataSchema = z.object({
	label: z.string().optional(),
	type: z.enum(NODE_TYPES),
	config: z.record(z.string(), z.unknown()).default({}),
});

export type WorkflowNodeData = z.infer<typeof workflowNodeDataSchema>;

export type WorkflowGraphNode = {
	id: string;
	type?: string;
	position: { x: number; y: number };
	data: WorkflowNodeData;
};

export type WorkflowGraphEdge = {
	id: string;
	source: string;
	target: string;
	sourceHandle?: string | null;
	targetHandle?: string | null;
	label?: string;
};

export type WorkflowRuntimeContext = {
	env: Record<string, string>;
	trigger: Record<string, unknown>;
	nodes: Record<string, Record<string, unknown>>;
	loop?: { index: number; item: unknown; items?: unknown[] };
};

export type WorkflowCursor = {
	/** Next node ids to execute */
	frontier: string[];
	/** Completed node ids */
	completed: string[];
	/** Active loop stack frames */
	loops?: Array<{
		nodeId: string;
		index: number;
		items: unknown[];
		bodyEntryId?: string;
		exitTargetId?: string;
	}>;
};

export type NodeHandlerResult =
	| {
			kind: "success";
			output: Record<string, unknown>;
			/** Override next nodes (If / Loop). Null = use outgoing edges. */
			next?: string[] | null;
	  }
	| {
			kind: "wait";
			output?: Record<string, unknown>;
			wait: {
				waitKind:
					| "AGENT_SESSION"
					| "HUMAN_APPROVAL"
					| "SCHEDULE"
					| "HTTP_CALLBACK";
				externalId?: string;
				resumeAt?: Date;
				payload?: Record<string, unknown>;
			};
	  }
	| {
			kind: "end";
			output: Record<string, unknown>;
	  };

export type NodeHandlerArgs = {
	node: WorkflowGraphNode;
	context: WorkflowRuntimeContext;
	run: {
		id: string;
		organizationId: string;
		campaignId: string;
		workflowId: string;
	};
	stepId: string;
	edges: WorkflowGraphEdge[];
	nodes: WorkflowGraphNode[];
};
