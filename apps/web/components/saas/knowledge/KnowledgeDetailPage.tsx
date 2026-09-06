"use client";

import { Button } from "@repo/ui/button";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export function KnowledgeDetailPage({ sourceId }: { sourceId: string }) {
	const query = useQuery(
		orpc.knowledge.get.queryOptions({
			input: { id: sourceId },
		}),
	);

	const kb = query.data?.knowledgeBase;

	if (query.isLoading) {
		return <p className="px-6 text-muted-foreground text-sm">Loading…</p>;
	}

	if (!kb) {
		return (
			<p className="px-6 text-destructive text-sm">
				Knowledge base not found.
			</p>
		);
	}

	const documents =
		(kb as { documents?: Array<{ id: string; title?: string | null; name?: string | null }> })
			.documents ?? [];

	return (
		<section className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 md:px-6">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">
						{kb.name}
					</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						{kb.description ?? "No description"}
					</p>
				</div>
				<Button variant="outline" className="rounded-full" asChild>
					<Link href="/app/knowledge-base">Back</Link>
				</Button>
			</div>

			<div className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm ring-1 ring-black/5">
				<h2 className="font-semibold text-lg">Documents</h2>
				{documents.length === 0 ? (
					<p className="mt-3 text-muted-foreground text-sm">
						No documents yet. Upload and ingest will be wired to the
						knowledge API next.
					</p>
				) : (
					<ul className="mt-4 space-y-2">
						{documents.map((doc) => (
							<li
								key={doc.id}
								className="rounded-2xl bg-muted/40 px-4 py-3 text-sm"
							>
								{doc.title ?? doc.name ?? doc.id}
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
