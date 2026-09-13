"use client";

import { LinkedInLogoIcon, TwitterLogoIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { Logo } from "@/components/shared/components/Logo";

export function Footer() {
	return (
		<footer className="bg-background w-full py-12 lg:py-20">
			<div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 lg:gap-9 lg:px-8">
				<nav
					className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-9"
					aria-label="Footer navigation"
				>
					<div className="flex flex-col gap-2.5">
						<h3 className="text-muted-foreground text-sm font-medium">
							Product
						</h3>
						<ul className="flex flex-col gap-3">
							<li className="text-base">
								<Link
									href="#"
									className="flex items-center gap-1"
								>
									Solutions
								</Link>
							</li>
							<li className="text-base">
								<Link
									href="#"
									className="flex items-center gap-1"
								>
									Use Cases
								</Link>
							</li>
						</ul>
					</div>
					<div className="flex flex-col gap-2.5">
						<h3 className="text-muted-foreground text-sm font-medium">
							Company
						</h3>
						<ul className="flex flex-col gap-3">
							<li className="text-base">
								<Link
									href="#"
									className="flex items-center gap-1"
								>
									About Us
								</Link>
							</li>
							<li className="text-base">
								<Link
									href="#"
									className="flex items-center gap-1"
								>
									Careers
								</Link>
							</li>
						</ul>
					</div>
					<div className="flex flex-col gap-2.5">
						<h3 className="text-muted-foreground text-sm font-medium">
							Resources
						</h3>
						<ul className="flex flex-col gap-3">
							<li className="text-base">
								<Link
									href="#"
									className="flex items-center gap-1"
								>
									FAQs
								</Link>
							</li>
							<li className="text-base">
								<Link
									href="#"
									className="flex items-center gap-1"
								>
									Blog
								</Link>
							</li>
						</ul>
					</div>
					<div className="flex flex-col gap-2.5">
						<h3 className="text-muted-foreground text-sm font-medium">
							Legal
						</h3>
						<ul className="flex flex-col gap-3">
							<li className="text-base">
								<Link
									href="/legal/privacy-policy"
									className="flex items-center gap-1"
								>
									Privacy Policy
								</Link>
							</li>
							<li className="text-base">
								<Link
									href="/legal/terms"
									className="flex items-center gap-1"
								>
									Terms of Service
								</Link>
							</li>
						</ul>
					</div>
				</nav>
				<div
					data-orientation="horizontal"
					role="none"
					data-slot="separator"
					className="shrink-0 bg-border h-px w-full"
					aria-hidden="true"
				/>
				<div className="flex flex-col gap-9 md:flex-row md:items-center md:justify-between">
					<Logo withLabel={true} />
					<div className="flex flex-col gap-4 md:flex-row md:items-center">
						<div className="flex items-center gap-3 md:gap-4">
							<LinkedInLogoIcon
								className="size-4 text-primary"
								onClick={() =>
									window.open(
										"https://www.linkedin.com/company/sashflow",
										"_blank",
									)
								}
							/>
							<TwitterLogoIcon
								className="size-4 text-primary"
								onClick={() =>
									window.open(
										"https://x.com/sashflow",
										"_blank",
									)
								}
							/>
						</div>
					</div>
				</div>
				<div className="text-muted-foreground text-sm text-center">
					© Copyright{" "}
					<span className="text-primary">
						Sashflow Technologies Private Limited
					</span>
					. 2026. All right reserved.
				</div>
			</div>
		</footer>
	);
}
