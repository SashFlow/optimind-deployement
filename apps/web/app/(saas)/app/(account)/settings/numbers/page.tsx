"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { cn } from "@repo/ui/utils";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useState } from "react";
import { useSettingsPageAction } from "@/components/saas/admin/AdminSettingsActions";
import { DispatchRulesPanel } from "@/components/saas/numbers/DispatchRulesPanel";
import {
	useAgentsQuery,
	useDispatchRulesQuery,
	usePhoneNumbersQuery,
	useSipTrunksQuery,
} from "@/components/saas/numbers/lib/hooks";
import { NumbersInventory } from "@/components/saas/numbers/NumbersInventory";
import { PlivoBuyPanel } from "@/components/saas/numbers/PlivoBuyPanel";
import { SipTrunksPanel } from "@/components/saas/numbers/SipTrunksPanel";

type NumbersTab = "numbers" | "get" | "trunks" | "routing";

const NUMBER_TABS: { value: NumbersTab; label: string }[] = [
	{ value: "numbers", label: "Numbers" },
	{ value: "get", label: "Get numbers" },
	{ value: "trunks", label: "Trunks" },
	{ value: "routing", label: "Routing" },
];

const pillTriggerClass =
	"h-9 flex-none gap-2 rounded-full px-4 py-2 text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none data-[active=true]:bg-foreground data-[active=true]:text-background data-[state=active]:hover:bg-foreground data-[state=active]:hover:text-background";

export default function NumbersPage() {
	const { activeOrganization } = useActiveOrganization();
	const activeOrganizationId = activeOrganization?.id ?? null;
	const [tab, setTab] = useState<NumbersTab>("numbers");

	const numbersQuery = usePhoneNumbersQuery(activeOrganizationId);
	const trunksQuery = useSipTrunksQuery(activeOrganizationId);
	const rulesQuery = useDispatchRulesQuery(activeOrganizationId);
	const agentsQuery = useAgentsQuery(activeOrganizationId);

	const agents = agentsQuery.data ?? [];
	const counts: Partial<Record<NumbersTab, number>> = {
		numbers: numbersQuery.data?.length ?? 0,
		trunks: trunksQuery.data?.length ?? 0,
		routing: rulesQuery.data?.length ?? 0,
	};

	useSettingsPageAction(() => setTab("get"));

	return (
		<section className="space-y-6">
			{!activeOrganizationId ? (
				<p className="text-sm text-muted-foreground">
					Select an organization to manage telephony.
				</p>
			) : (
				<div className="overflow-hidden rounded-3xl border bg-card shadow-sm ring-1 ring-black/5">
					<Tabs
						value={tab}
						onValueChange={(value) => {
							if (
								value === "numbers" ||
								value === "get" ||
								value === "trunks" ||
								value === "routing"
							) {
								setTab(value);
							}
						}}
					>
						<div className="border-b p-5">
							<TabsList className="h-auto w-fit gap-0.5 rounded-full bg-sidebar p-1 text-muted-foreground shadow-sm ring-1 ring-black/5">
								{NUMBER_TABS.map((item) => {
									const isActive = item.value === tab;
									const count = counts[item.value] ?? 0;
									return (
										<TabsTrigger
											key={item.value}
											value={item.value}
											data-active={
												isActive ? "true" : undefined
											}
											className={cn(pillTriggerClass)}
											style={
												isActive
													? {
															backgroundColor:
																"var(--foreground)",
															color: "var(--background)",
														}
													: undefined
											}
										>
											{item.label}
											{count > 0 ? (
												<span
													className={cn(
														"rounded-md px-1.5 py-0.5 text-[10px] tabular-nums",
														isActive
															? "bg-background/15 text-background"
															: "bg-muted text-muted-foreground",
													)}
												>
													{count}
												</span>
											) : null}
										</TabsTrigger>
									);
								})}
							</TabsList>
						</div>

						<TabsContent
							value="numbers"
							className="mt-0 outline-none"
						>
							<NumbersInventory
								organizationId={activeOrganizationId}
								agents={agents}
								onGetNumber={() => setTab("get")}
								onManageRouting={() => setTab("routing")}
							/>
						</TabsContent>

						<TabsContent value="get" className="mt-0 outline-none">
							<PlivoBuyPanel
								organizationId={activeOrganizationId}
								agents={agents}
								onPurchased={() => setTab("numbers")}
							/>
						</TabsContent>

						<TabsContent
							value="trunks"
							className="mt-0 outline-none"
						>
							<SipTrunksPanel
								organizationId={activeOrganizationId}
							/>
						</TabsContent>

						<TabsContent
							value="routing"
							className="mt-0 outline-none"
						>
							<DispatchRulesPanel
								organizationId={activeOrganizationId}
								agents={agents}
								onCreateTrunk={() => setTab("trunks")}
							/>
						</TabsContent>
					</Tabs>
				</div>
			)}
		</section>
	);
}
