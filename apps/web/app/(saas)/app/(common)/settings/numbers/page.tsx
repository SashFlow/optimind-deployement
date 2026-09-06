"use client";

import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";

export default function NumbersSettingsPage() {
	const { activeOrganization } = useActiveOrganization();
	const organizationId = activeOrganization?.id ?? "";

	const numbersQuery = useQuery({
		...orpc.telephony.listNumbers.queryOptions({
			input: { organizationId },
		}),
		enabled: !!organizationId,
	});

	const trunksQuery = useQuery({
		...orpc.telephony.listTrunks.queryOptions({
			input: { organizationId },
		}),
		enabled: !!organizationId,
	});

	const numbers = numbersQuery.data?.phoneNumbers ?? [];
	const trunks = trunksQuery.data?.sipTrunks ?? [];

	return (
		<div className="space-y-6">
			<section className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm ring-1 ring-black/5">
				<h1 className="font-semibold text-xl tracking-tight">
					Phone numbers
				</h1>
				{numbersQuery.isLoading ? (
					<p className="mt-3 text-muted-foreground text-sm">Loading…</p>
				) : numbers.length === 0 ? (
					<p className="mt-3 text-muted-foreground text-sm">
						No phone numbers provisioned yet.
					</p>
				) : (
					<ul className="mt-4 space-y-2">
						{numbers.map(
							(number: {
								id: string;
								e164?: string | null;
								number?: string | null;
							}) => (
								<li
									key={number.id}
									className="rounded-2xl bg-muted/40 px-4 py-3 text-sm"
								>
									{number.e164 ?? number.number ?? number.id}
								</li>
							),
						)}
					</ul>
				)}
			</section>

			<section className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm ring-1 ring-black/5">
				<h2 className="font-semibold text-lg tracking-tight">
					SIP trunks
				</h2>
				{trunksQuery.isLoading ? (
					<p className="mt-3 text-muted-foreground text-sm">Loading…</p>
				) : trunks.length === 0 ? (
					<p className="mt-3 text-muted-foreground text-sm">
						No SIP trunks configured yet.
					</p>
				) : (
					<ul className="mt-4 space-y-2">
						{trunks.map(
							(trunk: { id: string; name?: string | null }) => (
								<li
									key={trunk.id}
									className="rounded-2xl bg-muted/40 px-4 py-3 text-sm"
								>
									{trunk.name ?? trunk.id}
								</li>
							),
						)}
					</ul>
				)}
			</section>
		</div>
	);
}
