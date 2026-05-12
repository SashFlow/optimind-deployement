import { AiChat } from "@saas/ai/components/AiChat";
import { getActiveOrganization } from "@saas/auth/lib/server";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { orpcClient } from "@shared/lib/orpc-client";
import { orpc } from "@shared/lib/orpc-query-utils";
import { getServerQueryClient } from "@shared/lib/server";
import { redirect } from "next/navigation";

export default async function AiDemoPage({
	params,
}: {
	params: Promise<{ organizationSlug: string }>;
}) {
	const { organizationSlug } = await params;
	const organization = await getActiveOrganization(organizationSlug);
	const queryClient = getServerQueryClient();

	if (!organization) {
		redirect("/app");
	}

	const organizationId = organization.id;

	const { chats } = await orpcClient.ai.chats.list({
		organizationId,
	});

	await queryClient.prefetchQuery({
		queryKey: orpc.ai.chats.list.queryKey({
			input: {
				organizationId,
			},
		}),
		queryFn: async () => ({ chats }),
	});

	if (chats.length > 0) {
		const chatId = chats[0].id;

		await queryClient.prefetchQuery({
			queryKey: orpc.ai.chats.find.queryKey({
				input: {
					id: chatId,
				},
			}),
			queryFn: () =>
				orpcClient.ai.chats.find({
					id: chatId,
				}),
		});
	}

	return (
		<>
			<PageHeader
				title="AI Chatbot"
				subtitle="This is an example chatbot built with the OpenAI API"
			/>

			<AiChat organizationId={organizationId} />
		</>
	);
}
