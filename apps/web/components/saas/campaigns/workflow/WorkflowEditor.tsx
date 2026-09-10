"use client";

import { Button } from "@repo/ui/button";
import {
	Background,
	Controls,
	MiniMap,
	ReactFlow,
	ReactFlowProvider,
	addEdge,
	useEdgesState,
	useNodesState,
	type Connection,
	type Edge,
	type Node,
	type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { WORKFLOW_NODE_CATALOG } from "./catalog";
import { WorkflowFlowNode, type WorkflowNodeData } from "./WorkflowFlowNode";
import { WorkflowInspector } from "./WorkflowInspector";

const nodeTypes = { workflow: WorkflowFlowNode };

function newId(prefix: string) {
	return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function WorkflowEditorInner({ campaignId }: { campaignId: string }) {
	const queryClient = useQueryClient();
	const defQuery = useQuery(
		orpc.workflows.getDefinition.queryOptions({
			input: { campaignId },
		}),
	);

	const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
	const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
	const [envVars, setEnvVars] = useState<
		Array<{ key: string; value: string; isSecret?: boolean }>
	>([]);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		const wf = defQuery.data?.workflow;
		if (!wf || hydrated) return;
		const draftNodes = Array.isArray(wf.draftNodes)
			? (wf.draftNodes as Node[])
			: [];
		const draftEdges = Array.isArray(wf.draftEdges)
			? (wf.draftEdges as Edge[])
			: [];
		setNodes(
			draftNodes.map((n) => ({
				...n,
				type: "workflow",
			})),
		);
		setEdges(draftEdges);
		if (wf.draftViewport && typeof wf.draftViewport === "object") {
			setViewport(wf.draftViewport as Viewport);
		}
		if (Array.isArray(wf.envVars)) {
			setEnvVars(
				wf.envVars as Array<{
					key: string;
					value: string;
					isSecret?: boolean;
				}>,
			);
		}
		setHydrated(true);
	}, [defQuery.data, hydrated, setNodes, setEdges]);

	const saveMutation = useMutation(
		orpc.workflows.saveDraft.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.workflows.getDefinition.key({
						input: { campaignId },
					}),
				});
				toast.success("Draft saved");
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const publishMutation = useMutation(
		orpc.workflows.publish.mutationOptions({
			onSuccess: async () => {
				await queryClient.invalidateQueries({
					queryKey: orpc.workflows.getDefinition.key({
						input: { campaignId },
					}),
				});
				toast.success("Workflow published");
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const testMutation = useMutation(
		orpc.workflows.triggerTestRun.mutationOptions({
			onSuccess: (data) => {
				toast.success(`Test run ${data.run?.status ?? "started"}`);
			},
			onError: (e) => toast.error(e.message),
		}),
	);

	const onConnect = useCallback(
		(connection: Connection) => {
			setEdges((eds) =>
				addEdge(
					{
						...connection,
						id: newId("e"),
					},
					eds,
				),
			);
		},
		[setEdges],
	);

	const selected = useMemo(() => {
		const n = nodes.find((node) => node.selected);
		if (!n) return null;
		return {
			id: n.id,
			data: n.data as WorkflowNodeData,
		};
	}, [nodes]);

	function addNode(
		type: string,
		label: string,
		defaultConfig: Record<string, unknown>,
	) {
		const id = newId(type.replace(".", "_"));
		setNodes((nds) => [
			...nds,
			{
				id,
				type: "workflow",
				position: {
					x: 120 + nds.length * 24,
					y: 80 + nds.length * 36,
				},
				data: {
					type,
					label,
					config: { ...defaultConfig },
				} satisfies WorkflowNodeData,
			},
		]);
	}

	function persist(extra?: { publish?: boolean; test?: boolean }) {
		const payload = {
			campaignId,
			nodes: nodes.map((n) => ({
				id: n.id,
				type: "workflow",
				position: n.position,
				data: n.data,
			})),
			edges: edges.map((e) => ({
				id: e.id,
				source: e.source,
				target: e.target,
				sourceHandle: e.sourceHandle,
				targetHandle: e.targetHandle,
				label: typeof e.label === "string" ? e.label : undefined,
			})),
			viewport,
			envVars,
		};
		saveMutation.mutate(payload, {
			onSuccess: () => {
				if (extra?.publish) {
					publishMutation.mutate({ campaignId });
				}
				if (extra?.test) {
					testMutation.mutate({ campaignId, useDraft: true });
				}
			},
		});
	}

	const webhookToken = defQuery.data?.workflow.webhookToken;
	const publishedVersion = defQuery.data?.workflow.publishedVersion;

	return (
		<div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
			<aside className="flex w-52 shrink-0 flex-col gap-3 overflow-y-auto rounded-xl border bg-card/40 p-2">
				{WORKFLOW_NODE_CATALOG.map((group) => (
					<div key={group.category} className="space-y-1">
						<div className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
							{group.category}
						</div>
						{group.items.map((item) => (
							<button
								key={item.type}
								type="button"
								className="w-full rounded-lg border bg-background px-2 py-1.5 text-left text-xs hover:bg-muted/60"
								onClick={() =>
									addNode(
										item.type,
										item.label,
										item.defaultConfig as Record<
											string,
											unknown
										>,
									)
								}
							>
								<div className="font-medium">{item.label}</div>
								<div className="text-[10px] text-muted-foreground">
									{item.description}
								</div>
							</button>
						))}
					</div>
				))}
			</aside>

			<div className="relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-xl border bg-background">
				<div className="absolute right-3 top-3 z-10 flex flex-wrap gap-2">
					<Button
						size="sm"
						variant="outline"
						onClick={() => persist()}
						disabled={saveMutation.isPending}
					>
						Save draft
					</Button>
					<Button
						size="sm"
						variant="secondary"
						onClick={() => persist({ publish: true })}
						disabled={publishMutation.isPending}
					>
						Publish
					</Button>
					<Button
						size="sm"
						onClick={() => persist({ test: true })}
						disabled={testMutation.isPending}
					>
						Test run
					</Button>
				</div>
				{webhookToken && (
					<div className="absolute bottom-3 left-3 z-10 max-w-[70%] truncate rounded-md bg-background/90 px-2 py-1 text-[10px] text-muted-foreground ring-1 ring-border">
						Webhook: /api/workflows/hooks/{webhookToken}
						{publishedVersion
							? ` · published v${publishedVersion.version}`
							: " · not published"}
					</div>
				)}
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					nodeTypes={nodeTypes}
					fitView
					onViewportChange={setViewport}
					defaultViewport={viewport}
					deleteKeyCode={["Backspace", "Delete"]}
				>
					<Background gap={18} size={1} />
					<Controls />
					<MiniMap pannable zoomable />
				</ReactFlow>
			</div>

			<aside className="w-80 shrink-0 overflow-hidden rounded-xl border bg-card/40">
				<WorkflowInspector
					selected={selected}
					envVars={envVars}
					onEnvVarsChange={setEnvVars}
					allNodes={nodes.map((n) => ({
						id: n.id,
						data: n.data as WorkflowNodeData,
					}))}
					onChange={(data) => {
						if (!selected) return;
						setNodes((nds) =>
							nds.map((n) =>
								n.id === selected.id ? { ...n, data } : n,
							),
						);
					}}
				/>
			</aside>
		</div>
	);
}

export function WorkflowEditor({ campaignId }: { campaignId: string }) {
	return (
		<ReactFlowProvider>
			<WorkflowEditorInner campaignId={campaignId} />
		</ReactFlowProvider>
	);
}
