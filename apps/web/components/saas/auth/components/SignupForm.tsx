"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@repo/auth/client";
import { config } from "@repo/config";
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
import { AuthPasswordInput } from "@saas/auth/components/AuthPasswordInput";
import { useAuthErrorMessages } from "@saas/auth/hooks/errors-messages";
import { OrganizationInvitationAlert } from "@saas/organizations/components/OrganizationInvitationAlert";
import { MailboxIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { withQuery } from "ufo";
import { z } from "zod";
import {
	type OAuthProvider,
	oAuthProviders,
} from "../constants/oauth-providers";
import { SocialSigninButton } from "./SocialSigninButton";

const formSchema = z.object({
	email: z.string().email(),
	name: z.string().min(1),
	password: z.string(),
});

export function SignupForm({ prefillEmail }: { prefillEmail?: string }) {
	const t = useTranslations();
	const router = useRouter();
	const { getAuthErrorMessage } = useAuthErrorMessages();
	const searchParams = useSearchParams();

	const invitationId = searchParams.get("invitationId");
	const email = searchParams.get("email");
	const redirectTo = searchParams.get("redirectTo");

	const form = useForm({
		resolver: zodResolver(formSchema),
		values: {
			name: "",
			email: prefillEmail ?? email ?? "",
			password: "",
		},
	});

	const invitationOnlyMode = !config.auth.enableSignup && invitationId;

	const redirectPath = invitationId
		? `/organization-invitation/${invitationId}`
		: (redirectTo ?? config.auth.redirectAfterSignIn);

	const onSubmit = form.handleSubmit(async ({ email, password, name }) => {
		try {
			const { error } = await (config.auth.enablePasswordLogin
				? await authClient.signUp.email({
						email,
						password,
						name,
						callbackURL: redirectPath,
					})
				: authClient.signIn.magicLink({
						email,
						name,
						callbackURL: redirectPath,
					}));

			if (error) {
				throw error;
			}

			if (invitationOnlyMode && invitationId) {
				const { error: acceptError } =
					await authClient.organization.acceptInvitation({
						invitationId,
					});

				if (acceptError) {
					throw acceptError;
				}

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

	if (form.formState.isSubmitSuccessful && !invitationOnlyMode) {
		return (
			<AuthCard title={t("auth.signup.title")}>
				<Alert variant="success">
					<MailboxIcon />
					<AlertTitle>
						{t("auth.signup.hints.verifyEmail")}
					</AlertTitle>
				</Alert>
			</AuthCard>
		);
	}

	return (
		<AuthCard
			title={t("auth.signup.title")}
			description={t("auth.signup.message")}
			footer={
				<>
					{t("auth.signup.alreadyHaveAccount")}{" "}
					<Link
						href={withQuery(
							"/auth/login",
							Object.fromEntries(searchParams.entries()),
						)}
						className="font-medium text-primary hover:underline"
					>
						{t("auth.signup.signIn")}
					</Link>
				</>
			}
		>
			{invitationId && <OrganizationInvitationAlert className="mb-6" />}

			<Form {...form}>
				<form className="space-y-5" onSubmit={onSubmit}>
					<AuthError
						message={
							form.formState.isSubmitted
								? (form.formState.errors.root?.message ?? null)
								: null
						}
					/>

					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem className="space-y-2">
								<FormLabel className="font-medium text-sm">
									{t("auth.signup.name")}
								</FormLabel>
								<FormControl>
									<Input
										{...field}
										className={authInputClassName}
										placeholder="Your name"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem className="space-y-2">
								<FormLabel className="font-medium text-sm">
									{t("auth.signup.email")}
								</FormLabel>
								<FormControl>
									<Input
										{...field}
										autoComplete="email"
										readOnly={!!prefillEmail}
										className={authInputClassName}
										placeholder="Enter your email"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{config.auth.enablePasswordLogin && (
						<FormField
							control={form.control}
							name="password"
							render={({ field }) => (
								<FormItem className="space-y-2">
									<FormLabel className="font-medium text-sm">
										{t("auth.signup.password")}
									</FormLabel>
									<FormControl>
										<AuthPasswordInput
											{...field}
											autoComplete="new-password"
											placeholder="Create a password"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					)}

					<Button
						className={authSubmitClassName}
						loading={form.formState.isSubmitting}
					>
						{t("auth.signup.submit")}
					</Button>
				</form>
			</Form>

			{config.auth.enableSignup && config.auth.enableSocialLogin && (
				<>
					<div className="relative my-6 h-4">
						<hr className="relative top-2" />
						<p className="-translate-x-1/2 absolute top-0 left-1/2 mx-auto inline-block h-4 bg-white px-2 text-center font-medium text-muted-foreground text-sm leading-tight">
							{t("auth.login.continueWith")}
						</p>
					</div>
					<div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-2">
						{Object.keys(oAuthProviders).map((providerId) => (
							<SocialSigninButton
								key={providerId}
								provider={providerId as OAuthProvider}
							/>
						))}
					</div>
				</>
			)}
		</AuthCard>
	);
}
