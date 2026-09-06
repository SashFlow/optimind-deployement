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
import { sessionQueryKey } from "@saas/auth/lib/api";
import { OrganizationInvitationAlert } from "@saas/organizations/components/OrganizationInvitationAlert";
import { useRouter } from "@shared/hooks/router";
import { useQueryClient } from "@tanstack/react-query";
import { KeyIcon, MailboxIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { withQuery } from "ufo";
import { z } from "zod";
import {
	type OAuthProvider,
	oAuthProviders,
} from "../constants/oauth-providers";
import { useSession } from "../hooks/use-session";
import { LoginModeSwitch } from "./LoginModeSwitch";
import { SocialSigninButton } from "./SocialSigninButton";

const formSchema = z.union([
	z.object({
		mode: z.literal("magic-link"),
		email: z.string().email(),
	}),
	z.object({
		mode: z.literal("password"),
		email: z.string().email(),
		password: z.string().min(1),
	}),
]);

type FormValues = z.infer<typeof formSchema>;

export function LoginForm() {
	const t = useTranslations();
	const { getAuthErrorMessage } = useAuthErrorMessages();
	const router = useRouter();
	const queryClient = useQueryClient();
	const searchParams = useSearchParams();
	const { user, loaded: sessionLoaded } = useSession();

	const invitationId = searchParams.get("invitationId");
	const email = searchParams.get("email");
	const redirectTo = searchParams.get("redirectTo");

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: email ?? "",
			password: "",
			mode: config.auth.enablePasswordLogin ? "password" : "magic-link",
		},
	});

	const redirectPath = invitationId
		? `/organization-invitation/${invitationId}`
		: (redirectTo ?? config.auth.redirectAfterSignIn);

	useEffect(() => {
		if (sessionLoaded && user) {
			router.replace(redirectPath);
		}
	}, [user, sessionLoaded, redirectPath, router]);

	const onSubmit: SubmitHandler<FormValues> = async (values) => {
		try {
			if (values.mode === "password") {
				const { data, error } = await authClient.signIn.email({
					...values,
				});

				if (error) {
					throw error;
				}

				if (
					(data as { twoFactorRedirect?: boolean }).twoFactorRedirect
				) {
					router.replace(
						withQuery(
							"/auth/verify",
							Object.fromEntries(searchParams.entries()),
						),
					);
					return;
				}

				queryClient.invalidateQueries({
					queryKey: sessionQueryKey,
				});

				router.replace(redirectPath);
			} else {
				const { error } = await authClient.signIn.magicLink({
					...values,
					callbackURL: redirectPath,
				});

				if (error) {
					throw error;
				}
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
	};

	const signInWithPasskey = async () => {
		try {
			await authClient.signIn.passkey();
			router.replace(redirectPath);
		} catch (e) {
			form.setError("root", {
				message: getAuthErrorMessage(
					e && typeof e === "object" && "code" in e
						? (e.code as string)
						: undefined,
				),
			});
		}
	};

	const signinMode = form.watch("mode");

	if (form.formState.isSubmitSuccessful && signinMode === "magic-link") {
		return (
			<AuthCard title={t("auth.login.title")}>
				<Alert variant="success">
					<MailboxIcon />
					<AlertTitle>
						{t("auth.login.hints.linkSent.title")}
					</AlertTitle>
					<AlertDescription>
						{t("auth.login.hints.linkSent.message")}
					</AlertDescription>
				</Alert>
			</AuthCard>
		);
	}

	return (
		<AuthCard
			title={t("auth.login.title")}
			description={t("auth.login.subtitle")}
			footer={
				config.auth.enableSignup ? (
					<>
						{t("auth.login.dontHaveAnAccount")}{" "}
						<Link
							href={withQuery(
								"/auth/signup",
								Object.fromEntries(searchParams.entries()),
							)}
							className="font-medium text-primary hover:underline"
						>
							{t("auth.login.createAnAccount")}
						</Link>
					</>
				) : undefined
			}
		>
			{invitationId && <OrganizationInvitationAlert className="mb-6" />}

			<Form {...form}>
				<form
					className="space-y-5"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					{config.auth.enableMagicLink &&
						config.auth.enablePasswordLogin && (
							<LoginModeSwitch
								activeMode={signinMode}
								onChange={(mode) =>
									form.setValue(
										"mode",
										mode as typeof signinMode,
									)
								}
							/>
						)}

					<AuthError
						message={
							form.formState.isSubmitted
								? (form.formState.errors.root?.message ?? null)
								: null
						}
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
										placeholder="Enter your email"
										className={authInputClassName}
									/>
								</FormControl>
							</FormItem>
						)}
					/>

					{config.auth.enablePasswordLogin &&
						signinMode === "password" && (
							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem className="space-y-2">
										<div className="flex items-center justify-between text-sm">
											<FormLabel className="font-medium">
												{t("auth.signup.password")}
											</FormLabel>
											<Link
												href="/auth/forgot-password"
												className="text-primary hover:underline"
											>
												{t("auth.login.forgotPassword")}
											</Link>
										</div>
										<FormControl>
											<AuthPasswordInput
												{...field}
												autoComplete="current-password"
												placeholder="Enter password"
											/>
										</FormControl>
									</FormItem>
								)}
							/>
						)}

					<Button
						className={authSubmitClassName}
						type="submit"
						loading={form.formState.isSubmitting}
					>
						{signinMode === "magic-link"
							? t("auth.login.sendMagicLink")
							: t("auth.login.submit")}
					</Button>
				</form>
			</Form>

			{(config.auth.enablePasskeys ||
				(config.auth.enableSignup &&
					config.auth.enableSocialLogin)) && (
				<>
					<div className="relative my-6 h-4">
						<hr className="relative top-2" />
						<p className="-translate-x-1/2 absolute top-0 left-1/2 mx-auto inline-block h-4 bg-white px-2 text-center font-medium text-muted-foreground text-sm leading-tight">
							{t("auth.login.continueWith")}
						</p>
					</div>

					<div className="grid grid-cols-1 items-stretch gap-2 sm:grid-cols-2">
						{config.auth.enableSignup &&
							config.auth.enableSocialLogin &&
							Object.keys(oAuthProviders).map((providerId) => (
								<SocialSigninButton
									key={providerId}
									provider={providerId as OAuthProvider}
								/>
							))}

						{config.auth.enablePasskeys && (
							<Button
								variant="outline"
								className="w-full rounded-full sm:col-span-2"
								onClick={() => signInWithPasskey()}
							>
								<KeyIcon className="mr-1.5 size-4" />
								{t("auth.login.loginWithPasskey")}
							</Button>
						)}
					</div>
				</>
			)}
		</AuthCard>
	);
}
