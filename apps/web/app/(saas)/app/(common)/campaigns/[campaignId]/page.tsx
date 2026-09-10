import { redirect } from "next/navigation";

export default async function CampaignIndexPage({
	params,
}: {
	params: Promise<{ campaignId: string }>;
}) {
	const { campaignId } = await params;
	redirect(`/app/campaigns/${campaignId}/dashboard`);
}
