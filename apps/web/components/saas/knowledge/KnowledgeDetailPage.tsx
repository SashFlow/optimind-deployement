"use client";

import { Button } from "@repo/ui/button";
import { LoadingState } from "@repo/ui/spinner";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AddDocumentDialog } from "@/components/saas/knowledge/AddDocumentDialog";
import { KnowledgeDocumentsTable } from "@/components/saas/knowledge/KnowledgeDocumentsTable";
import {
	useCreateDocumentMutation,
	useDeleteDocumentMutation,
	useKnowledgeBaseQuery,
} from "@/services/api/hooks";

export function KnowledgeDetailPage({ sourceId }: { sourceId: string }) {
	const [addOpen, setAddOpen] = useState(false);
	const query = useKnowledgeBaseQuery(sourceId);
	const createMutation = useCreateDocumentMutation(sourceId, {
		onSuccess: (doc) =>
			toast.success(
				doc.status === "READY"
					? "Document processed"
					: "Document queued for processing",
			),
		onError: (error) => toast.error(error.message),
	});
	const deleteMutation = useDeleteDocumentMutation(sourceId, {
		onSuccess: () => toast.success("Document deleted"),
		onError: (error) => toast.error(error.message),
	});

	const kb = query.data;

	if (query.isLoading) {
		return <LoadingState />;
	}

	if (!kb) {
		return (
			<p className="px-6 text-destructive text-sm">
				Knowledge base not found.
			</p>
		);
	}

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

			<KnowledgeDocumentsTable
				documents={kb.documents}
				isLoading={query.isFetching && !kb.documents.length}
				isError={query.isError}
				isDeleting={deleteMutation.isPending}
				onAddDocument={() => setAddOpen(true)}
				onDeleteDocument={async (documentId) => {
					await deleteMutation.mutateAsync(documentId);
				}}
			/>

			<AddDocumentDialog
				open={addOpen}
				onOpenChange={setAddOpen}
				isPending={createMutation.isPending}
				onCreate={(input) => createMutation.mutateAsync(input)}
			/>
		</section>
	);
}
