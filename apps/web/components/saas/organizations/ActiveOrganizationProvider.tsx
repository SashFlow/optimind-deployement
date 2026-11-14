"use client";

import { authClient } from "@repo/auth/client";
import { isOrganizationAdmin } from "@repo/auth/lib/helper";
import { config } from "@repo/config";
import { useRouter } from "@shared/hooks/router";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import nProgress from "nprogress";
import { type ReactNode, useMemo } from "react";
import { ActiveOrganizationContext } from "@/context/ActiveOrganizationProvider";
import { useSession } from "@/context/SessionProvider";
import { sessionQueryKey } from "@/services/auth";
import {
	activeOrganizationQueryKey,
	useActiveOrganizationQuery,
	useOrganizationListQuery,
} from "@/services/organization";

export function ActiveOrganizationProvider({
	children,
}: {
	children: ReactNode;
}) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { session, user } = useSession();
	const params = useParams();
	const { data: organizationList, isFetched: isOrganizationListFetched } =
		useOrganizationListQuery();

	const activeOrganizationSlugFromParams = params.organizationSlug as
		| string
		| undefined;

	const resolvedSlug = useMemo(() => {
		if (activeOrganizationSlugFromParams) {
			return activeOrganizationSlugFromParams;
		}
		const activeId = session?.activeOrganizationId;
		if (activeId && organizationList) {
			return (
				organizationList.find((org) => org.id === activeId)?.slug ??
				organizationList[0]?.slug
			);
		}
		return organizationList?.[0]?.slug;
	}, [
		activeOrganizationSlugFromParams,
		session?.activeOrganizationId,
		organizationList,
	]);

	const { data: activeOrganization, isFetched: isActiveOrganizationFetched } =
		useActiveOrganizationQuery(resolvedSlug ?? "", {
			enabled: !!resolvedSlug,
		});

	const refetchActiveOrganization = async () => {
		if (!resolvedSlug) {
			return;
		}
		await queryClient.refetchQueries({
			queryKey: activeOrganizationQueryKey(resolvedSlug),
		});
	};

	const setActiveOrganization = async (organizationSlug: string | null) => {
		nProgress.start();
		const { data: newActiveOrganization, error } =
			await authClient.organization.setActive(
				organizationSlug
					? {
							organizationSlug,
						}
					: {
							organizationId: null,
						},
			);

		if (error) {
			nProgress.done();
			throw new Error(
				error.message || "Failed to set active organization",
			);
		}

		if (!newActiveOrganization) {
			nProgress.done();
			return;
		}

		await queryClient.invalidateQueries({
			queryKey: ["user", "activeOrganization"],
		});

		if (config.organizations.enableBilling) {
			await queryClient.prefetchQuery(
				orpc.payments.listPurchases.queryOptions({
					input: {
						organizationId: newActiveOrganization.id,
					},
				}),
			);
		}

		await queryClient.setQueryData(sessionQueryKey, (data: any) => {
			return {
				...data,
				session: {
					...data?.session,
					activeOrganizationId: newActiveOrganization.id,
				},
			};
		});

		if (params.organizationSlug) {
			router.push("/app/dashboard");
		} else {
			router.refresh();
		}
		nProgress.done();
	};

	const loaded =
		(Boolean(activeOrganizationSlugFromParams) ||
			isOrganizationListFetched) &&
		(!resolvedSlug || isActiveOrganizationFetched);

	const memberRole = activeOrganization?.members.find(
		(member) => member.userId === session?.userId,
	)?.role;
	// Platform admins can access orgs without membership; treat them as admins.
	const activeOrganizationUserRole =
		memberRole ?? (user?.role === "admin" ? "admin" : null);

	return (
		<ActiveOrganizationContext.Provider
			value={{
				loaded,
				activeOrganization: activeOrganization ?? null,
				activeOrganizationUserRole: activeOrganizationUserRole ?? null,
				isOrganizationAdmin:
					!!activeOrganization &&
					!!user &&
					isOrganizationAdmin(activeOrganization, user),
				setActiveOrganization,
				refetchActiveOrganization,
			}}
		>
			{children}
		</ActiveOrganizationContext.Provider>
	);
}
