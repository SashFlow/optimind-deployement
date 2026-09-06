"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@repo/auth/client";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@repo/ui/form";
import { Input } from "@repo/ui/input";
import {
	AuthCard,
	AuthError,
	authInputClassName,
	authSubmitClassName,
} from "@saas/auth/components/AuthCard";
import { useAuthErrorMessages } from "@saas/auth/hooks/errors-messages";
import { MailboxIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
	email: z.string().email(),
});

type FormValues = z.infer<typeof formSchema>;

export function ForgotPasswordForm() {
	const t = useTranslations();
	const { getAuthErrorMessage } = useAuthErrorMessages();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
		},
	});

	const onSubmit = form.handleSubmit(async ({ email }) => {
		try {
			const redirectTo = new URL(
				"/auth/reset-password",
				window.location.origin,
			).toString();

			const { error } = await authClient.requestPasswordReset({
				email,
				redirectTo,
			});

			if (error) {
				throw error;
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

	if (form.formState.isSubmitSuccessful) {
		return (
			<AuthCard title={t("auth.forgotPassword.title")}>
				<Alert variant="success">
					<MailboxIcon />
					<AlertTitle>
						{t("auth.forgotPassword.hints.linkSent.title")}
					</AlertTitle>
					<AlertDescription>
						{t("auth.forgotPassword.hints.linkSent.message")}
					</AlertDescription>
				</Alert>
			</AuthCard>
		);
	}

	return (
		<AuthCard
			title={t("auth.forgotPassword.title")}
			description={t("auth.forgotPassword.message")}
			footer={
				<Link
					href="/auth/login"
					className="font-medium text-primary hover:underline"
				>
					{t("auth.forgotPassword.backToSignin")}
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
						name="email"
						render={({ field }) => (
							<FormItem className="space-y-2">
								<FormLabel className="font-medium text-sm">
									{t("auth.forgotPassword.email")}
								</FormLabel>
								<FormControl>
									<Input
										{...field}
										autoComplete="email"
										className={authInputClassName}
										placeholder="Enter your email"
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
						{t("auth.forgotPassword.submit")}
					</Button>
				</form>
			</Form>
		</AuthCard>
	);
}
