"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/dialog";
import { ChangeEmailForm } from "@/components/saas/settings/ChangeEmailForm";
import { ChangeNameForm } from "@/components/saas/settings/ChangeNameForm";
import { ChangePasswordForm } from "@/components/saas/settings/ChangePassword";
import { DeleteAccountForm } from "@/components/saas/settings/DeleteAccountForm";
import { TwoFactorBlock } from "@/components/saas/settings/TwoFactorBlock";
import { UserAvatarForm } from "@/components/saas/settings/UserAvatarForm";

type AccountSettingsDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function AccountSettingsDialog({
	open,
	onOpenChange,
}: AccountSettingsDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[min(85dvh,40rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
				<DialogHeader className="shrink-0 border-b px-6 py-4">
					<DialogTitle>Account</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col gap-4 overflow-y-auto p-6">
					<UserAvatarForm />
					<ChangeNameForm />
					<ChangeEmailForm />
					<ChangePasswordForm />
					<TwoFactorBlock />
					<DeleteAccountForm />
				</div>
			</DialogContent>
		</Dialog>
	);
}
