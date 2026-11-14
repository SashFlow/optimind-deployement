"use client";

import { TabViewTransition } from "@components/shared/view-transition";
import {
	FolderTabs,
	FolderTabsBar,
	FolderTabsContent,
	FolderTabsList,
	FolderTabsTrigger,
} from "@repo/ui/folder-tabs";
import { Skeleton } from "@repo/ui/skeleton";
import { useState } from "react";
import { DispatchRulesPanel } from "@/components/saas/numbers/DispatchRulesPanel";
import { NumbersInventory } from "@/components/saas/numbers/NumbersInventory";
import { SipTrunksPanel } from "@/components/saas/numbers/SipTrunksPanel";
import { MemberPermissionEmpty } from "@/components/saas/shared/MemberPermissionEmpty";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import { useAgentsQuery } from "@/hooks/numbers";
import type { Agent } from "@/types/numbers";

type NumbersTab = "numbers" | "trunks" | "routing";

export default function NumbersPageContent() {
	const [tab, setTab] = useState<NumbersTab>("numbers");
	const { activeOrganization, activeOrganizationUserRole, loaded } =
		useActiveOrganization();
	const activeOrganizationId = activeOrganization?.id ?? null;
	const canManageNumbers = activeOrganizationUserRole !== "member";
	const agentsQuery = useAgentsQuery(
		canManageNumbers ? activeOrganizationId : null,
	);
	const agents = (agentsQuery.data ?? []) as Agent[];

	if (!loaded) {
		return <Skeleton className="h-full" />;
	}

	if (!canManageNumbers) {
		return (
			<MemberPermissionEmpty
				title="You don't have permissions to manage numbers"
				description="Numbers are managed by organization owners and admins. Ask one of them if you need access."
			/>
		);
	}

	return (
		<FolderTabs
			value={tab}
			onValueChange={(value) => setTab(value as NumbersTab)}
			className="min-h-0 flex-1"
		>
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="numbers">
						Numbers
					</FolderTabsTrigger>
					<FolderTabsTrigger value="trunks">Trunks</FolderTabsTrigger>
					<FolderTabsTrigger value="routing">
						Routing
					</FolderTabsTrigger>
				</FolderTabsList>
			</FolderTabsBar>
			<TabViewTransition
				activeValue={tab}
				orderedValues={["numbers", "trunks", "routing"]}
			>
				<FolderTabsContent value="numbers">
					<NumbersInventory
						organizationId={activeOrganizationId}
						agents={agents}
					/>
				</FolderTabsContent>
				<FolderTabsContent value="trunks">
					<SipTrunksPanel organizationId={activeOrganizationId} />
				</FolderTabsContent>
				<FolderTabsContent value="routing">
					<DispatchRulesPanel
						organizationId={activeOrganizationId}
						agents={agents}
						onCreateTrunk={() => setTab("trunks")}
					/>
				</FolderTabsContent>
			</TabViewTransition>
		</FolderTabs>
	);
}
