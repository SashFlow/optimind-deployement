import { createORPCClient, onError } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { ApiRouterClient } from "@repo/api/orpc/router";
import { getBaseUrl } from "@repo/utils";

const link = new RPCLink({
	url: `${getBaseUrl()}/api/rpc`,
	headers: async () => {
		if (typeof window !== "undefined") {
			return {};
		}

		const { headers } = await import("next/headers");
		return Object.fromEntries(await headers());
	},
	interceptors: [
		onError((error, options: { next(): unknown; signal?: AbortSignal }) => {
			// Aborted requests (incl. Strict Mode remounts) must not hit console.error —
			// Next.js surfaces those as runtime overlay errors.
			if (
				options.signal?.aborted ||
				(error instanceof Error && error.name === "AbortError")
			) {
				return;
			}

			console.error(error);
		}),
	],
});

export const orpcClient: ApiRouterClient = createORPCClient(link);
