"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/table";
import { useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "@/components/saas/admin/lib/loading-state";
import {
	useBuyPlivoNumberMutation,
	usePlivoSearchQuery,
	useSipTrunksQuery,
} from "@/components/saas/numbers/lib/hooks";
import type { Agent } from "@/components/saas/numbers/lib/types";

const COUNTRIES = [
	{ iso: "US", label: "United States" },
	{ iso: "CA", label: "Canada" },
	{ iso: "GB", label: "United Kingdom" },
	{ iso: "IN", label: "India" },
] as const;

type PlivoBuyPanelProps = {
	organizationId: string | null;
	agents: Agent[];
	onPurchased: () => void;
};

export function PlivoBuyPanel({
	organizationId,
	agents,
	onPurchased,
}: PlivoBuyPanelProps) {
	const trunksQuery = useSipTrunksQuery(organizationId);
	const [countryIso, setCountryIso] = useState("US");
	const [pattern, setPattern] = useState("");
	const [searchEnabled, setSearchEnabled] = useState(false);
	const [agentId, setAgentId] = useState("");
	const [trunkMode, setTrunkMode] = useState<"auto" | "existing">("auto");
	const [sipTrunkId, setSipTrunkId] = useState("");
	const [buyingNumber, setBuyingNumber] = useState<string | null>(null);

	const searchQuery = usePlivoSearchQuery(
		organizationId,
		countryIso,
		pattern,
		searchEnabled,
	);
	const buyMutation = useBuyPlivoNumberMutation(organizationId);

	const inboundTrunks = (trunksQuery.data ?? []).filter(
		(trunk) => trunk.direction === "inbound",
	);

	async function buyNumber(number: string) {
		setBuyingNumber(number);
		try {
			await buyMutation.mutateAsync({
				number,
				assigned_agent_id: agentId || undefined,
				sip_trunk_id:
					trunkMode === "existing" && sipTrunkId
						? sipTrunkId
						: undefined,
				create_inbound_trunk: trunkMode === "auto",
			});
			toast.success(`Synced after mock buy of ${number}`);
			onPurchased();
		} catch (cause) {
			toast.error(
				cause instanceof Error ? cause.message : "Failed to buy number",
			);
		} finally {
			setBuyingNumber(null);
		}
	}

	return (
		<div>
			<div className="space-y-4 border-b p-5">
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div className="space-y-2">
						<Label>Country</Label>
						<Select
							value={countryIso}
							onValueChange={setCountryIso}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{COUNTRIES.map((country) => (
									<SelectItem
										key={country.iso}
										value={country.iso}
									>
										{country.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="pattern">Pattern</Label>
						<Input
							id="pattern"
							value={pattern}
							onChange={(event) => setPattern(event.target.value)}
							placeholder="555"
						/>
					</div>
					<div className="space-y-2">
						<Label>Agent</Label>
						<Select
							value={agentId || "none"}
							onValueChange={(value) =>
								setAgentId(value === "none" ? "" : value)
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Optional" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">None</SelectItem>
								{agents.map((agent) => (
									<SelectItem key={agent.id} value={agent.id}>
										{agent.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Inbound trunk</Label>
						<Select
							value={trunkMode}
							onValueChange={(value) => {
								if (value === "auto" || value === "existing") {
									setTrunkMode(value);
								}
							}}
						>
							<SelectTrigger className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="auto">
									Create / sync automatically
								</SelectItem>
								<SelectItem value="existing">
									Use existing trunk
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{trunkMode === "existing" ? (
					<div className="max-w-sm space-y-2">
						<Label>Existing trunk</Label>
						<Select
							value={sipTrunkId || "none"}
							onValueChange={(value) =>
								setSipTrunkId(value === "none" ? "" : value)
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select trunk" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">
									Select trunk
								</SelectItem>
								{inboundTrunks.map((trunk) => (
									<SelectItem key={trunk.id} value={trunk.id}>
										{trunk.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				) : null}

				<Button
					type="button"
					onClick={() => setSearchEnabled(true)}
					disabled={!organizationId}
				>
					Search numbers
				</Button>
				<p className="text-xs text-muted-foreground">
					Buy flow is mocked — results are sample numbers; purchase
					syncs Plivo inventory.
				</p>
			</div>

			{!searchEnabled ? (
				<p className="p-6 text-sm text-muted-foreground">
					Search to see available numbers.
				</p>
			) : searchQuery.isPending ? (
				<LoadingState />
			) : searchQuery.isError ? (
				<p className="p-6 text-sm text-destructive">Search failed.</p>
			) : (searchQuery.data ?? []).length === 0 ? (
				<p className="p-6 text-sm text-muted-foreground">
					No numbers found.
				</p>
			) : (
				<div className="overflow-x-auto scrollbar-none">
					<Table>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead>Number</TableHead>
								<TableHead>Capabilities</TableHead>
								<TableHead>Monthly</TableHead>
								<TableHead>Setup</TableHead>
								<TableHead className="text-right">
									Action
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{(searchQuery.data ?? []).map((item) => (
								<TableRow key={item.number}>
									<TableCell className="font-mono font-medium">
										{item.number}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{[
											item.voice_enabled ? "Voice" : null,
											item.sms_enabled ? "SMS" : null,
										]
											.filter(Boolean)
											.join(" · ") || "—"}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{item.monthly_rental_rate ?? "—"}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{item.setup_rate ?? "—"}
									</TableCell>
									<TableCell className="text-right">
										<Button
											size="sm"
											disabled={
												buyMutation.isPending ||
												(trunkMode === "existing" &&
													!sipTrunkId)
											}
											onClick={() =>
												void buyNumber(item.number)
											}
										>
											{buyingNumber === item.number
												? "Buying…"
												: "Buy"}
										</Button>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
