"use client";

import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/context/SessionProvider";
import { organizationListQueryKey } from "@/services/organization";

export function ImpersonationBanner() {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { session, user, reloadSession } = useSession();
	const [stopping, setStopping] = useState(false);

	if (!session?.impersonatedBy || !user) {
		return null;
	}

	const stopImpersonating = async () => {
		setStopping(true);
		try {
			const { error } = await authClient.admin.stopImpersonating();
			if (error) {
				toast.error(
					error.message || t("admin.users.impersonation.stopError"),
				);
				return;
			}

			await reloadSession();
			await queryClient.invalidateQueries({
				queryKey: organizationListQueryKey,
			});
			toast.success(t("admin.users.impersonation.stopped"));
			router.push("/app/settings/member");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: t("admin.users.impersonation.stopError"),
			);
		} finally {
			setStopping(false);
		}
	};

	return (
		<div className="sticky top-0 z-50 flex items-center justify-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-100">
			<span>
				{t("admin.users.impersonation.impersonating", {
					name: user.name,
				})}
			</span>
			<Button
				type="button"
				size="sm"
				variant="outline"
				className="h-7 border-amber-600/40 bg-background/80"
				disabled={stopping}
				onClick={() => {
					void stopImpersonating();
				}}
			>
				{stopping
					? t("admin.users.impersonation.stopping")
					: t("admin.users.impersonation.stop")}
			</Button>
		</div>
	);
}
