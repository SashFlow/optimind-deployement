"use client";

import { ResourcePage } from "@saas/app/ResourcePage";
import { PlugIcon } from "lucide-react";

const integrations = [
	{
		id: "livekit",
		title: "LiveKit",
		description: "Realtime voice and avatar rooms",
		status: "Connected",
		filterKey: "connected",
	},
	{
		id: "plivo",
		title: "Plivo",
		description: "Phone numbers and SIP",
		status: "Available",
		filterKey: "available",
	},
	{
		id: "openai",
		title: "OpenAI",
		description: "LLM and realtime models",
		status: "Available",
		filterKey: "available",
	},
];

export default function IntegrationsPage() {
	return (
		<ResourcePage
			filters={[
				{ label: "All", value: "all", count: integrations.length },
				{
					label: "Connected",
					value: "connected",
					count: integrations.filter((i) => i.filterKey === "connected")
						.length,
				},
				{
					label: "Available",
					value: "available",
					count: integrations.filter((i) => i.filterKey === "available")
						.length,
				},
			]}
			items={integrations.map((item) => ({
				...item,
				icon: <PlugIcon className="size-4" />,
			}))}
			searchPlaceholder="Search integrations"
			empty={{
				icon: <PlugIcon className="size-8" />,
				title: "No integrations",
				description: "Integrations will appear here.",
			}}
		/>
	);
}
