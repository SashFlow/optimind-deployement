import type { Edge, Node } from "@xyflow/react";

/** Simple left-to-right layered layout from start nodes (BFS). */
export function organizeWorkflowNodes(nodes: Node[], edges: Edge[]): Node[] {
	if (nodes.length === 0) {
		return nodes;
	}

	const outgoing = new Map<string, string[]>();
	const indegree = new Map<string, number>();
	for (const n of nodes) {
		outgoing.set(n.id, []);
		indegree.set(n.id, 0);
	}
	for (const e of edges) {
		if (!outgoing.has(e.source) || !indegree.has(e.target)) {
			continue;
		}
		outgoing.get(e.source)?.push(e.target);
		indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
	}

	const starts = nodes.filter((n) => {
		const t = (n.data as { type?: string })?.type ?? "";
		return t.startsWith("start.") || (indegree.get(n.id) ?? 0) === 0;
	});
	const queue = starts.map((n) => n.id);
	const layer = new Map<string, number>();
	for (const id of queue) {
		layer.set(id, 0);
	}

	while (queue.length) {
		const id = queue.shift();
		if (id === undefined) {
			break;
		}
		const L = layer.get(id) ?? 0;
		for (const next of outgoing.get(id) ?? []) {
			const nextLayer = Math.max(layer.get(next) ?? 0, L + 1);
			if (!layer.has(next) || nextLayer > (layer.get(next) ?? 0)) {
				layer.set(next, nextLayer);
				queue.push(next);
			}
		}
	}

	for (const n of nodes) {
		if (!layer.has(n.id)) {
			layer.set(n.id, 0);
		}
	}

	const byLayer = new Map<number, string[]>();
	for (const [id, L] of layer) {
		const list = byLayer.get(L) ?? [];
		list.push(id);
		byLayer.set(L, list);
	}

	const COL_GAP = 280;
	const ROW_GAP = 120;
	const ORIGIN_X = 80;
	const ORIGIN_Y = 80;

	const positions = new Map<string, { x: number; y: number }>();
	const layers = [...byLayer.keys()].sort((a, b) => a - b);
	for (const L of layers) {
		const ids = byLayer.get(L) ?? [];
		ids.forEach((id, i) => {
			positions.set(id, {
				x: ORIGIN_X + L * COL_GAP,
				y: ORIGIN_Y + i * ROW_GAP,
			});
		});
	}

	return nodes.map((n) => ({
		...n,
		position: positions.get(n.id) ?? n.position,
	}));
}

export function downloadWorkflowJson(filename: string, payload: unknown) {
	const blob = new Blob([JSON.stringify(payload, null, 2)], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	a.click();
	URL.revokeObjectURL(url);
}
