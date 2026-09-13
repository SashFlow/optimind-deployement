"use client";

import {
	FolderTabs,
	FolderTabsBack,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { useParams } from "next/navigation";
import {
	AgentSessionDetail,
	SessionEventsPanel,
} from "@/components/saas/agents/AgentSessionDetail";
import type { SessionDetail } from "@/components/saas/agents/lib/hooks";
import { useSessionDetailQuery } from "@/components/saas/agents/lib/hooks";
import { PageSectionSkeleton } from "@/components/saas/shared/skeletons";

export default function AgentSessionPage() {
	const params = useParams<{ agentId: string; sessionId: string }>();
	const sessionQuery = useSessionDetailQuery(params.sessionId);

	if (sessionQuery.isLoading) {
		return <PageSectionSkeleton variant="detail" />;
	}

	const data = sessionQuery.data as { session?: SessionDetail } | undefined;

	if (sessionQuery.isError || !data?.session) {
		return (
			<p className="p-6 text-sm text-destructive">
				Failed to load session.
			</p>
		);
	}

	const session = data.session;
	const events = session.events ?? [];

	return (
		<FolderTabs defaultValue="overview" className="min-h-0 flex-1">
			<FolderTabsBar>
				<FolderTabsBack href={`/app/agents/${params.agentId}`} />
				<FolderTabsList>
					<FolderTabsTrigger value="overview">
						Overview
					</FolderTabsTrigger>
					<FolderTabsTrigger value="events">Events</FolderTabsTrigger>
				</FolderTabsList>
			</FolderTabsBar>
			<FolderTabsContent value="overview">
				<AgentSessionDetail session={session} />
			</FolderTabsContent>
			<FolderTabsContent value="events" scrollable={false}>
				<SessionEventsPanel events={events} />
			</FolderTabsContent>
		</FolderTabs>
	);
}
