"use client";

import { authClient } from "@repo/auth/client";
import { isOrganizationAdmin } from "@repo/auth/lib/helper";
import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
import { sessionQueryKey } from "@saas/auth/lib/api";
import {
	activeOrganizationQueryKey,
	useActiveOrganizationQuery,
	useOrganizationListQuery,
} from "@saas/organizations/lib/api";
import { useRouter } from "@shared/hooks/router";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import nProgress from "nprogress";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ActiveOrganizationContext } from "../lib/active-organization-context";

export function ActiveOrganizationProvider({
	children,
}: {
	children: ReactNode;
}) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { session, user } = useSession();
	const params = useParams();
	const { data: organizationList } = useOrganizationListQuery();

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

	const { data: activeOrganization } = useActiveOrganizationQuery(
		resolvedSlug ?? "",
		{
			enabled: !!resolvedSlug,
		},
	);

	const refetchActiveOrganization = async () => {
		if (!resolvedSlug) return;
		await queryClient.refetchQueries({
			queryKey: activeOrganizationQueryKey(resolvedSlug),
		});
	};

	const setActiveOrganization = async (organizationSlug: string | null) => {
		nProgress.start();
		const { data: newActiveOrganization } =
			await authClient.organization.setActive(
				organizationSlug
					? {
						organizationSlug,
					}
					: {
						organizationId: null,
					},
			);

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
			router.push(`/app/dashboard`);
		} else {
			router.refresh();
		}
		nProgress.done();
	};

	const [loaded, setLoaded] = useState(activeOrganization !== undefined);

	useEffect(() => {
		if (!loaded && activeOrganization !== undefined) {
			setLoaded(true);
		}
	}, [activeOrganization, loaded]);

	const activeOrganizationUserRole = activeOrganization?.members.find(
		(member) => member.userId === session?.userId,
	)?.role;

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
