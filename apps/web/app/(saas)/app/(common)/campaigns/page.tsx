"use client";

import { MegaphoneIcon } from "lucide-react";
import * as React from "react";

import { ResourceCreateDialog } from "@/components/saas/app/ResourceCreateDialog";
import {
	type ResourceItem,
	ResourcePage,
} from "@/components/saas/app/ResourcePage";

export default function CampaignsPage() {
	const [campaigns, setCampaigns] = React.useState<ResourceItem[]>([]);

	const filters = [
		{ label: "All", value: "all", count: campaigns.length },
		{
			label: "Active",
			value: "active",
			count: campaigns.filter(
				(campaign) => campaign.filterKey === "active",
			).length,
		},
		{
			label: "Drafts",
			value: "drafts",
			count: campaigns.filter(
				(campaign) => campaign.filterKey === "drafts",
			).length,
		},
	];

	function addCampaign(name: string, description: string) {
		setCampaigns((current) => [
			...current,
			{
				id: `${Date.now()}-${name}`,
				title: name,
				description:
					description ||
					"A campaign ready for audience and schedule setup.",
				status: "Draft",
				filterKey: "drafts",
				owner: "me",
				meta: "Not scheduled",
				icon: <MegaphoneIcon className="size-4" />,
			},
		]);
	}

	return (
		<ResourcePage
			filters={filters}
			items={campaigns}
			searchPlaceholder="Search campaigns by name..."
			createAction={
				<ResourceCreateDialog
					title="Create campaign"
					description="Set up an outbound campaign for your workspace."
					namePlaceholder="e.g. Spring outreach"
					descriptionPlaceholder="What is this campaign for?"
					submitLabel="Create"
					onCreate={addCampaign}
				/>
			}
			empty={{
				icon: <MegaphoneIcon />,
				title: "No campaigns yet",
				description:
					"Create a campaign to organize and launch your outreach.",
			}}
		/>
	);
}
