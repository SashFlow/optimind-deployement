"use client";

import { orpcClient } from "@shared/lib/orpc-client";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
	type Agent,
	type DispatchRule,
	mapDispatchRule,
	mapPhoneNumber,
	mapSipTrunk,
	type PhoneNumber,
	type PlivoSearchResult,
	type SipTrunk,
} from "./types";

export function useAgentsQuery(organizationId: string | null | undefined) {
	return useQuery({
		...orpc.agents.list.queryOptions({
			input: { organizationId: organizationId ?? "" },
		}),
		enabled: !!organizationId,
		select: (data): Agent[] =>
			(data?.agents ?? []).map((agent) => ({
				id: agent.id,
				name: agent.name,
			})),
	});
}

export function usePhoneNumbersQuery(
	organizationId: string | null | undefined,
) {
	return useQuery({
		...orpc.telephony.listNumbers.queryOptions({
			input: { organizationId: organizationId ?? "" },
		}),
		enabled: !!organizationId,
		select: (data): PhoneNumber[] =>
			(data?.phoneNumbers ?? []).map(mapPhoneNumber),
	});
}

export function useSipTrunksQuery(organizationId: string | null | undefined) {
	return useQuery({
		...orpc.telephony.listTrunks.queryOptions({
			input: { organizationId: organizationId ?? "" },
		}),
		enabled: !!organizationId,
		select: (data): SipTrunk[] =>
			(data?.sipTrunks ?? [])
				.map(mapSipTrunk)
				.filter((trunk) => trunk.status !== "deleted"),
	});
}

export function useDispatchRulesQuery(
	organizationId: string | null | undefined,
) {
	return useQuery({
		...orpc.telephony.listRules.queryOptions({
			input: { organizationId: organizationId ?? "" },
		}),
		enabled: !!organizationId,
		select: (data): DispatchRule[] =>
			(data?.dispatchRules ?? [])
				.map(mapDispatchRule)
				.filter((rule) => rule.is_enabled || true)
				.filter((rule) => {
					const metaDeleted = !rule.is_enabled && rule.numbers.length === 0;
					return !metaDeleted || rule.is_enabled;
				}),
	});
}

export function useUpdatePhoneNumberMutation(
	organizationId: string | null | undefined,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			numberId,
			data,
		}: {
			numberId: string;
			data: {
				assigned_agent_id?: string | null;
				sip_trunk_id?: string | null;
				is_active?: boolean;
				friendly_name?: string;
			};
		}) => {
			if (data.is_active === false) {
				toast.message("Deactivate is mocked until an API is available");
				return;
			}
			if (data.is_active === true) {
				toast.message("Activate is mocked until an API is available");
				return;
			}
			await orpcClient.telephony.assignNumber({
				id: numberId,
				agentId: data.assigned_agent_id,
				sipTrunkId: data.sip_trunk_id,
				friendlyName: data.friendly_name,
			});
		},
		onSuccess: async () => {
			if (!organizationId) return;
			await queryClient.invalidateQueries({
				queryKey: orpc.telephony.listNumbers.key({
					input: { organizationId },
				}),
			});
		},
	});
}

export function useCreatePhoneNumberMutation(
	organizationId: string | null | undefined,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (_input: {
			e164: string;
			assigned_agent_id?: string | null;
			sip_trunk_id?: string | null;
		}) => {
			if (!organizationId) throw new Error("Select an organization first");
			await orpcClient.telephony.syncPlivoNumbers({ organizationId });
			toast.message(
				"Synced Plivo numbers. Manual register without Plivo is not available yet.",
			);
		},
		onSuccess: async () => {
			if (!organizationId) return;
			await queryClient.invalidateQueries({
				queryKey: orpc.telephony.listNumbers.key({
					input: { organizationId },
				}),
			});
		},
	});
}

export function useDeletePhoneNumberMutation(
	_organizationId: string | null | undefined,
) {
	return useMutation({
		mutationFn: async (_id: string) => {
			toast.message("Remove from inventory is not available via ORPC yet");
		},
	});
}

export function useReleasePlivoNumberMutation(
	_organizationId: string | null | undefined,
) {
	return useMutation({
		mutationFn: async (_id: string) => {
			toast.message("Release Plivo number is not available via ORPC yet");
		},
	});
}

export function useCreateSipTrunkMutation(
	organizationId: string | null | undefined,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			name: string;
			direction: "inbound" | "outbound";
			provider?: string;
			transport?: string;
			address?: string | null;
			allowed_addresses?: string[];
			sync_livekit?: boolean;
			numbers?: string[];
		}) => {
			if (!organizationId) throw new Error("Select an organization first");
			const numbers = input.numbers?.length
				? input.numbers
				: ["+10000000000"];
			if (input.direction === "outbound") {
				await orpcClient.telephony.provisionOutboundSip({
					organizationId,
					name: input.name,
					numbers,
					authUsername: "trunkuser",
					authPassword: "trunkpass",
					plivoOutboundAddress: input.address || undefined,
				});
			} else {
				await orpcClient.telephony.provisionInboundSip({
					organizationId,
					name: input.name,
					numbers,
					livekitSipHost:
						input.address || "example.sip.livekit.cloud",
				});
			}
		},
		onSuccess: async () => {
			if (!organizationId) return;
			await queryClient.invalidateQueries({
				queryKey: orpc.telephony.listTrunks.key({
					input: { organizationId },
				}),
			});
		},
	});
}

export function useUpdateSipTrunkMutation(
	_organizationId: string | null | undefined,
) {
	return useMutation({
		mutationFn: async (_input: {
			trunkId: string;
			data: Record<string, unknown>;
		}) => {
			toast.message("Update trunk is not available via ORPC yet");
		},
	});
}

export function useDeleteSipTrunkMutation(
	organizationId: string | null | undefined,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await orpcClient.telephony.deleteTrunk({ id });
		},
		onSuccess: async () => {
			if (!organizationId) return;
			await queryClient.invalidateQueries({
				queryKey: orpc.telephony.listTrunks.key({
					input: { organizationId },
				}),
			});
		},
	});
}

export function useCreateDispatchRuleMutation(
	organizationId: string | null | undefined,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			sip_trunk_id?: string;
			agent_id?: string;
			rule_type?: string;
			room_prefix?: string | null;
			numbers?: string[];
			sync_livekit?: boolean;
			is_enabled?: boolean;
			name?: string;
		}) => {
			if (!organizationId) throw new Error("Select an organization first");
			await orpcClient.telephony.createDispatch({
				organizationId,
				name: input.name || input.room_prefix || "Dispatch rule",
				sipTrunkId: input.sip_trunk_id || undefined,
				agentId: input.agent_id || undefined,
				roomPrefix: input.room_prefix || undefined,
			});
		},
		onSuccess: async () => {
			if (!organizationId) return;
			await queryClient.invalidateQueries({
				queryKey: orpc.telephony.listRules.key({
					input: { organizationId },
				}),
			});
		},
	});
}

export function useUpdateDispatchRuleMutation(
	_organizationId: string | null | undefined,
) {
	return useMutation({
		mutationFn: async (_input: {
			ruleId: string;
			data: Record<string, unknown>;
		}) => {
			toast.message("Update dispatch rule is not available via ORPC yet");
		},
	});
}

export function useDeleteDispatchRuleMutation(
	organizationId: string | null | undefined,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await orpcClient.telephony.deleteRule({ id });
		},
		onSuccess: async () => {
			if (!organizationId) return;
			await queryClient.invalidateQueries({
				queryKey: orpc.telephony.listRules.key({
					input: { organizationId },
				}),
			});
		},
	});
}

const MOCK_PLIVO_SEARCH: PlivoSearchResult[] = [
	{
		number: "+14155550100",
		monthly_rental_rate: "1.00",
		voice_enabled: true,
		sms_enabled: true,
		region: "CA",
	},
	{
		number: "+14155550101",
		monthly_rental_rate: "1.00",
		voice_enabled: true,
		sms_enabled: false,
		region: "CA",
	},
	{
		number: "+12125550123",
		monthly_rental_rate: "1.25",
		voice_enabled: true,
		sms_enabled: true,
		region: "NY",
	},
];

export function usePlivoSearchQuery(
	organizationId: string | null | undefined,
	_countryIso: string,
	pattern: string,
	enabled: boolean,
) {
	return useQuery({
		queryKey: ["mock-plivo-search", organizationId, pattern, enabled],
		enabled: !!organizationId && enabled,
		queryFn: async (): Promise<PlivoSearchResult[]> => {
			await new Promise((resolve) => setTimeout(resolve, 250));
			const q = pattern.trim().toLowerCase();
			if (!q) return MOCK_PLIVO_SEARCH;
			return MOCK_PLIVO_SEARCH.filter((row) =>
				row.number.toLowerCase().includes(q),
			);
		},
	});
}

export function usePlivoAccountNumbersQuery(
	organizationId: string | null | undefined,
	enabled: boolean,
) {
	return useQuery({
		...orpc.telephony.listNumbers.queryOptions({
			input: { organizationId: organizationId ?? "" },
		}),
		enabled: !!organizationId && enabled,
		select: (data): PlivoSearchResult[] =>
			(data?.phoneNumbers ?? []).map((row) => ({
				number: row.e164,
				monthly_rental_rate: "—",
				voice_enabled: true,
				sms_enabled: false,
			})),
	});
}

export function useBuyPlivoNumberMutation(
	organizationId: string | null | undefined,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (_input: {
			number: string;
			assigned_agent_id?: string | null;
			agent_id?: string | null;
			sip_trunk_id?: string | null;
			create_inbound_trunk?: boolean;
		}) => {
			if (!organizationId) throw new Error("Select an organization first");
			await orpcClient.telephony.syncPlivoNumbers({ organizationId });
			toast.message(
				"Buy flow is mocked — synced existing Plivo numbers instead.",
			);
		},
		onSuccess: async () => {
			if (!organizationId) return;
			await queryClient.invalidateQueries({
				queryKey: orpc.telephony.listNumbers.key({
					input: { organizationId },
				}),
			});
		},
	});
}
