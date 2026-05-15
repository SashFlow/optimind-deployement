import Logout from "@components/shared/logout";
import { authClient } from "@repo/auth/client";
import { config } from "@repo/config";
import { createPurchasesHelper } from "@repo/payments/lib/helper";
import { getOrganizationList, getSession } from "@saas/auth/lib/server";
import { orpcClient } from "@shared/lib/orpc-client";
import { attemptAsync } from "es-toolkit";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Layout({ children }: PropsWithChildren) {
	const session = await getSession();

	if (!session) {
		redirect("/auth/login");
	}

	if (config.users.enableOnboarding && !session.user.onboardingComplete) {
		redirect("/onboarding");
	}

	const organizations = await getOrganizationList();

	if (
		config.organizations.enable &&
		config.organizations.requireOrganization
	) {
		const organization =
			organizations.find(
				(org) => org.id === session?.session.activeOrganizationId,
			) || organizations[0];

		if (!organization) {
			redirect("/new-organization");
		}
	}

	const hasFreePlan = Object.values(config.payments.plans).some(
		(plan) => "isFree" in plan,
	);

	if (
		((config.organizations.enable && config.organizations.enableBilling) ||
			config.users.enableBilling) &&
		!hasFreePlan
	) {
		const organizationId = config.organizations.enable
			? session?.session.activeOrganizationId || organizations?.at(0)?.id
			: undefined;

		const [error, data] = await attemptAsync(() =>
			orpcClient.payments.listPurchases({
				organizationId,
			}),
		);

		if (error) {
			throw new Error("Failed to fetch purchases");
		}

		const purchases = data?.purchases ?? [];

		const { activePlan } = createPurchasesHelper(purchases);

		if (!activePlan) {
			redirect("/choose-plan");
		}
	}
	const onLogout = () => {
		authClient.signOut({
			fetchOptions: {
				onSuccess: async () => {
					window.location.href = new URL(
						config.auth.redirectAfterLogout,
						window.location.origin,
					).toString();
				},
			},
		});
	};

	return (
		<main className="min-h-screen bg-backgroudn text-foreground noise">
			<header className="fixed inset-x-0 top-0 z-50 border-b border-border/50 bg-[#494846] backdrop-blur-xl">
				<div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
					<Link
						href="/"
						className="flex items-center gap-2 font-display text-2xl"
					>
						<span className="inline-block h-2 w-2 rounded-full bg-signal" />
						Sashflow
					</Link>

					<nav className="hidden items-center gap-8 font-mono text-xs uppercase tracking-widest text-muted-foreground md:flex md:justify-self-center">
						<Link
							href="/app/playground"
							className="transition-colors hover:text-foreground"
						>
							Playground
						</Link>
						<Link
							href="/app/share"
							className="transition-colors hover:text-foreground"
						>
							Share
						</Link>
						<Link
							href="/app/browser"
							className="transition-colors hover:text-foreground"
						>
							Records
						</Link>
					</nav>

					<Logout />

					<details className="relative ml-auto md:hidden">
						<summary className="flex cursor-pointer list-none items-center justify-center rounded-full border border-border/60 p-2 text-foreground transition-colors hover:bg-background/80">
							<span className="sr-only">
								Open navigation menu
							</span>
							<svg
								viewBox="0 0 24 24"
								className="size-5"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<path d="M3 6h18" />
								<path d="M3 12h18" />
								<path d="M3 18h18" />
							</svg>
						</summary>

						<div className="absolute right-0 top-12 w-56 rounded-xl border border-border/60 bg-background/95 p-3 shadow-lg backdrop-blur">
							<nav className="flex flex-col gap-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
								<Link
									href="/app/playground"
									className="rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-foreground"
								>
									Playground
								</Link>
								<Link
									href="/app/share"
									className="rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-foreground"
								>
									Share
								</Link>
								<Link
									href="/app/browser"
									className="rounded-md px-3 py-2 transition-colors hover:bg-muted hover:text-foreground"
								>
									Records
								</Link>
							</nav>

							<div className="mt-3 border-t border-border/60 pt-3">
								<Link
									href="/auth/login"
									className="block rounded-full border border-signal/30 px-4 py-2 text-center font-mono text-xs uppercase tracking-widest text-signal transition-colors hover:bg-signal hover:text-primary-foreground"
								>
									Log out
								</Link>
							</div>
						</div>
					</details>
				</div>
			</header>

			<div className="pt-16">{children}</div>
		</main>
	);
}
