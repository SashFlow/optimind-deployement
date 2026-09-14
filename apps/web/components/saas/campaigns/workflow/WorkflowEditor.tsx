"use client";

import { Button } from "@repo/ui/button";
import { ButtonGroup } from "@repo/ui/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import {
	addEdge,
	Background,
	BackgroundVariant,
	type Connection,
	type Edge,
	MiniMap,
	type Node,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	useReactFlow,
	type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { CatalogItem } from "./catalog";
import { downloadWorkflowJson, organizeWorkflowNodes } from "./layout";
import { WorkflowAddNodePanel } from "./WorkflowAddNodePanel";
import {
	type CanvasInteractionMode,
	WorkflowCanvasToolbar,
} from "./WorkflowCanvasToolbar";
import { WorkflowContextMenu } from "./WorkflowContextMenu";
import { WorkflowFlowNode, type WorkflowNodeData } from "./WorkflowFlowNode";
import { WorkflowInspectorPanel } from "./WorkflowInspectorPanel";

const nodeTypes = { workflow: WorkflowFlowNode };

function newId(prefix: string) {
	return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function WorkflowEditorInner({ campaignId }: { campaignId: string }) {
	const queryClient = useQueryClient();
	const { screenToFlowPosition, fitView } = useReactFlow();

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
	const [mode, setMode] = useState<CanvasInteractionMode>("pointer");

	const [addPanelOpen, setAddPanelOpen] = useState(false);
	const [addPanelAnchor, setAddPanelAnchor] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const toolbarRef = useRef<HTMLDivElement>(null);
	const [dropFlowPos, setDropFlowPos] = useState<{
		x: number;
		y: number;
	} | null>(null);

	const [contextMenu, setContextMenu] = useState<{
		x: number;
		y: number;
	} | null>(null);

	useEffect(() => {
		const wf = defQuery.data?.workflow;
		if (!wf || hydrated) {
			return;
		}
		const draftNodes = Array.isArray(wf.draftNodes)
			? (wf.draftNodes as unknown as Node[])
			: [];
		const draftEdges = Array.isArray(wf.draftEdges)
			? (wf.draftEdges as unknown as Edge[])
			: [];
		setNodes(
			draftNodes.map((n) => ({
				...n,
				type: "workflow",
			})),
		);
		setEdges(draftEdges);
		if (wf.draftViewport && typeof wf.draftViewport === "object") {
			setViewport(wf.draftViewport as unknown as Viewport);
		}
		if (Array.isArray(wf.envVars)) {
			setEnvVars(
				wf.envVars as unknown as Array<{
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
		if (!n) {
			return null;
		}
		return {
			id: n.id,
			data: n.data as WorkflowNodeData,
		};
	}, [nodes]);

	const openAddPanel = useCallback(
		(screen: { x: number; y: number }, flow?: { x: number; y: number }) => {
			setAddPanelAnchor(screen);
			setDropFlowPos(
				flow ??
					screenToFlowPosition({
						x: screen.x,
						y: screen.y,
					}),
			);
			setAddPanelOpen(true);
			setContextMenu(null);
		},
		[screenToFlowPosition],
	);

	function addCatalogNode(item: CatalogItem) {
		const id = newId(item.type.replace(".", "_"));
		const position = dropFlowPos ?? {
			x: 120 + nodes.length * 24,
			y: 80 + nodes.length * 36,
		};
		setNodes((nds) => [
			...nds,
			{
				id,
				type: "workflow",
				position,
				data: {
					type: item.type,
					label: item.label,
					config: { ...item.defaultConfig },
				} satisfies WorkflowNodeData,
			},
		]);
		setDropFlowPos(null);
	}

	function exportWorkflow() {
		downloadWorkflowJson(`workflow-${campaignId}.json`, {
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
			})),
			envVars,
			viewport,
		});
		toast.success("Workflow exported");
	}

	function organize() {
		setNodes((nds) => organizeWorkflowNodes(nds, edges));
		requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }));
		toast.success("Nodes organized");
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

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.altKey && (e.key === "r" || e.key === "R")) {
				e.preventDefault();
				persist({ test: true });
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- bind once for Alt+R shortcut
	}, []);

	const isHand = mode === "hand";
	const actionsBusy =
		saveMutation.isPending ||
		testMutation.isPending ||
		publishMutation.isPending;

	return (
		<div className="relative min-h-0 flex-1 overflow-hidden bg-[#F9FAFB]">
			<div className="absolute right-3 top-3 z-20 flex flex-wrap items-center gap-2">
				<Button
					size="sm"
					variant="outline"
					className="bg-white shadow-sm"
					onClick={() => persist({ test: true })}
					disabled={actionsBusy}
				>
					{testMutation.isPending ? "Running…" : "Test Run"}
				</Button>
				<ButtonGroup className="h-8 shadow-sm">
					<Button
						size="sm"
						disabled={actionsBusy}
						onClick={() => persist({ publish: true })}
						className="h-8"
					>
						{publishMutation.isPending
							? "Publishing…"
							: saveMutation.isPending
								? "Saving…"
								: "Publish"}
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								size="sm"
								disabled={actionsBusy}
								aria-label="More save options"
								className="h-8 px-2"
							>
								<ChevronDownIcon className="size-3.5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								disabled={actionsBusy}
								onClick={() => persist()}
							>
								Save draft
							</DropdownMenuItem>
							<DropdownMenuItem
								disabled={actionsBusy}
								onClick={() => persist({ publish: true })}
							>
								Publish
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</ButtonGroup>
			</div>

			<WorkflowCanvasToolbar
				ref={toolbarRef}
				mode={mode}
				onModeChange={setMode}
				addNodeOpen={addPanelOpen}
				onAddNode={() => {
					if (addPanelOpen) {
						setAddPanelOpen(false);
						return;
					}
					const toolbarRect =
						toolbarRef.current?.getBoundingClientRect();
					const canvasRect = document
						.querySelector(".workflow-canvas-root")
						?.getBoundingClientRect();
					const panelWidth = 300;
					const gap = 8;
					openAddPanel(
						{
							x:
								(toolbarRect?.left ?? 0) +
								(toolbarRect?.width ?? panelWidth) / 2 -
								panelWidth / 2,
							y: (toolbarRect?.bottom ?? 0) + gap,
						},
						screenToFlowPosition({
							x:
								(canvasRect?.left ?? 0) +
								(canvasRect?.width ?? 0) / 2,
							y:
								(canvasRect?.top ?? 0) +
								(canvasRect?.height ?? 0) / 2,
						}),
					);
				}}
				onOrganize={organize}
				onExport={exportWorkflow}
			/>

			<div className="workflow-canvas-root h-full w-full">
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
					panOnDrag={isHand ? true : [1, 2]}
					selectionOnDrag={!isHand}
					nodesDraggable={!isHand}
					elementsSelectable={!isHand}
					panOnScroll
					onPaneContextMenu={(e) => {
						e.preventDefault();
						setContextMenu({ x: e.clientX, y: e.clientY });
						setAddPanelOpen(false);
					}}
					onPaneClick={() => {
						setContextMenu(null);
					}}
					proOptions={{ hideAttribution: true }}
					defaultEdgeOptions={{
						style: { stroke: "#93C5FD", strokeWidth: 2 },
					}}
				>
					<Background
						id="workflow-dots"
						variant={BackgroundVariant.Dots}
						gap={18}
						size={1.5}
						color="#C4C9D2"
						bgColor="#F9FAFB"
					/>
					<MiniMap
						pannable
						zoomable
						position="bottom-left"
						className="!bottom-3 !left-3 !m-0 overflow-hidden rounded-lg border border-border bg-white/90 shadow-sm"
					/>
				</ReactFlow>
			</div>

			<WorkflowInspectorPanel
				open={!!selected}
				title={selected?.data.label ?? "Node config"}
				description={selected?.data.type}
				selected={selected}
				onChange={(data) => {
					if (!selected) {
						return;
					}
					setNodes((nds) =>
						nds.map((n) =>
							n.id === selected.id ? { ...n, data } : n,
						),
					);
				}}
				onClose={() => {
					setNodes((nds) =>
						nds.map((n) =>
							n.selected ? { ...n, selected: false } : n,
						),
					);
				}}
			/>

			<WorkflowAddNodePanel
				open={addPanelOpen}
				anchor={addPanelAnchor}
				onClose={() => setAddPanelOpen(false)}
				onSelect={addCatalogNode}
			/>

			<WorkflowContextMenu
				open={!!contextMenu}
				position={contextMenu}
				onClose={() => setContextMenu(null)}
				onAddNode={() => {
					if (!contextMenu) {
						return;
					}
					openAddPanel(
						contextMenu,
						screenToFlowPosition(contextMenu),
					);
				}}
				onTestRun={() => persist({ test: true })}
				onExport={exportWorkflow}
			/>
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
