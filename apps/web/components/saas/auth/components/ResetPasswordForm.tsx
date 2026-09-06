"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@repo/auth/client";
import { config } from "@repo/config";
import { Alert, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@repo/ui/form";
import {
	AuthCard,
	AuthError,
	authSubmitClassName,
} from "@saas/auth/components/AuthCard";
import { AuthPasswordInput } from "@saas/auth/components/AuthPasswordInput";
import { useAuthErrorMessages } from "@saas/auth/hooks/errors-messages";
import { useSession } from "@saas/auth/hooks/use-session";
import { useRouter } from "@shared/hooks/router";
import { MailboxIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
	password: z.string().min(8),
});

type FormValues = z.infer<typeof formSchema>;

export function ResetPasswordForm() {
	const t = useTranslations();
	const { user } = useSession();
	const router = useRouter();
	const { getAuthErrorMessage } = useAuthErrorMessages();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			password: "",
		},
	});

	const onSubmit = form.handleSubmit(async ({ password }) => {
		try {
			const { error } = await authClient.resetPassword({
				token: token ?? undefined,
				newPassword: password,
			});

			if (error) {
				throw error;
			}

			if (user) {
				router.push(config.auth.redirectAfterSignIn);
			}
		} catch (e) {
			form.setError("root", {
				message: getAuthErrorMessage(
					e && typeof e === "object" && "code" in e
						? (e.code as string)
						: undefined,
				),
			});
		}
	});

	if (!token) {
		return (
			<p className="text-destructive text-sm">
				Invalid or missing reset token.
			</p>
		);
	}

	if (form.formState.isSubmitSuccessful) {
		return (
			<AuthCard title={t("auth.resetPassword.title")}>
				<Alert variant="success">
					<MailboxIcon />
					<AlertTitle>
						{t("auth.resetPassword.hints.success")}
					</AlertTitle>
				</Alert>
				<div className="mt-6 text-center text-sm">
					<Link
						href="/auth/login"
						className="font-medium text-primary hover:underline"
					>
						{t("auth.resetPassword.backToSignin")}
					</Link>
				</div>
			</AuthCard>
		);
	}

	return (
		<AuthCard
			title={t("auth.resetPassword.title")}
			description={t("auth.resetPassword.message")}
			footer={
				<Link
					href="/auth/login"
					className="font-medium text-primary hover:underline"
				>
					{t("auth.resetPassword.backToSignin")}
				</Link>
			}
		>
			<Form {...form}>
				<form className="space-y-5" onSubmit={onSubmit}>
					<AuthError
						message={form.formState.errors.root?.message ?? null}
					/>

					<FormField
						control={form.control}
						name="password"
						render={({ field }) => (
							<FormItem className="space-y-2">
								<FormLabel className="font-medium text-sm">
									{t("auth.resetPassword.newPassword")}
								</FormLabel>
								<FormControl>
									<AuthPasswordInput
										autoComplete="new-password"
										placeholder="Enter new password"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Button
						className={authSubmitClassName}
						loading={form.formState.isSubmitting}
					>
						{t("auth.resetPassword.submit")}
					</Button>
				</form>
			</Form>
		</AuthCard>
	);
}
