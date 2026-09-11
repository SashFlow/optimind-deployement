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
import { PlivoBuyPanel } from "@/components/saas/numbers/PlivoBuyPanel";
import { SipTrunksPanel } from "@/components/saas/numbers/SipTrunksPanel";
import { useActiveOrganization } from "@/context/ActiveOrganizationProvider";
import { useAgentsQuery } from "@/hooks/numbers";
import type { Agent } from "@/types/numbers";

type NumbersTab = "buy" | "numbers" | "trunks" | "routing";

export default function NumbersPageContent() {
	const [tab, setTab] = useState<NumbersTab>("buy");
	const { activeOrganization, loaded } = useActiveOrganization();
	const activeOrganizationId = activeOrganization?.id ?? null;
	const agentsQuery = useAgentsQuery(activeOrganizationId);
	const agents = (agentsQuery.data ?? []) as Agent[];

	if (!loaded) {
		return <Skeleton className="h-full" />;
	}

	return (
		<FolderTabs
			value={tab}
			onValueChange={(value) => setTab(value as NumbersTab)}
			className="h-full"
		>
			<FolderTabsBar>
				<FolderTabsList>
					<FolderTabsTrigger value="buy">
						Buy Numbers
					</FolderTabsTrigger>
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
				orderedValues={["buy", "numbers", "trunks", "routing"]}
			>
				<FolderTabsContent value="numbers">
					<NumbersInventory
						organizationId={activeOrganizationId}
						agents={agents}
						onGetNumber={() => setTab("buy")}
						onManageRouting={() => setTab("routing")}
					/>
				</FolderTabsContent>
				<FolderTabsContent value="buy">
					<PlivoBuyPanel
						organizationId={activeOrganizationId}
						agents={agents}
						onPurchased={() => setTab("numbers")}
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
