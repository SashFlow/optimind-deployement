import { AiChat } from "@saas/ai/components/AiChat";
import { PageHeader } from "@saas/shared/components/PageHeader";
import { orpcClient } from "@shared/lib/orpc-client";
import { orpc } from "@shared/lib/orpc-query-utils";
import { getServerQueryClient } from "@shared/lib/server";

export default async function AiDemoPage() {
	const queryClient = getServerQueryClient();

	const chats = await (async () => {
		const { chats } = await orpcClient.ai.chats.list();

		return chats;
	})();

	await queryClient.prefetchQuery({
		queryKey: orpc.ai.chats.list.queryKey({
			input: {},
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

			<AiChat />
		</>
	);
}
