"use client";

import { FolderTabsActions } from "@repo/ui/folder-tabs";
import { PlusIcon } from "lucide-react";
import {
	type BulkActionKey,
	useAdminSettingsActions,
} from "@/context/AdminSettingsActionsProvider";

const JOB_BULK_ACTIONS: { key: BulkActionKey; label: string }[] = [
	{ key: "cancel-failed", label: "Cancel failed" },
	{ key: "retry-failed", label: "Retry failed" },
];

export function SettingsTabActions({
	showPlus = true,
}: {
	showPlus?: boolean;
}) {
	const { hasAction, actionLabel, runAction, hasBulk, runBulk } =
		useAdminSettingsActions();

	if (!hasAction && !hasBulk) return null;

	return (
		<FolderTabsActions>
			{hasBulk
				? JOB_BULK_ACTIONS.map((action) => (
						<button
							key={action.key}
							type="button"
							onClick={() => runBulk(action.key)}
							className="text-muted-foreground hover:bg-background/60 hover:text-foreground"
						>
							{action.label}
						</button>
					))
				: null}
			{hasAction ? (
				<button
					type="button"
					onClick={runAction}
					className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
				>
					{showPlus ? <PlusIcon className="size-4" /> : null}
					{actionLabel ?? "Create"}
				</button>
			) : null}
		</FolderTabsActions>
	);
}
