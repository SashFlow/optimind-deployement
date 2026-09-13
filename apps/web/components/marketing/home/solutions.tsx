"use client";

import {
	ActivityIcon,
	DatabaseIcon,
	Users2Icon,
	WorkflowIcon,
} from "lucide-react";
import Image from "next/image";
import React from "react";

const Solutions = () => {
	return (
		<section id="solutions" className="py-12 lg:py-20">
			<div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 lg:gap-16 lg:px-8">
				<div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 text-center">
					<span className="text-primary text-base font-medium">
						Benefits
					</span>
					<h2 className="text-3xl font-medium tracking-tight text-balance lg:text-4xl">
						AI That Works Your Way
					</h2>
					<p className="text-muted-foreground max-w-2xl text-base text-pretty">
						Acme Inc. eliminates the work and gives you a clear
						picture of what matters.
					</p>
				</div>
				<div className="grid w-full gap-5 md:grid-cols-[1fr_auto_1fr] md:border-b lg:gap-9">
					<div className="@container/benefit-card">
						<div className="flex flex-col gap-5 py-5 @xl/benefit-card:gap-6 lg:py-9">
							<div className="flex flex-1 flex-col gap-1.5">
								<h3 className="text-3xl font-medium tracking-tight">
									Intelligent Prioritization
								</h3>
								<p className="text-muted-foreground text-lg">
									Know exactly what to work on next with AI
									that understands your goals and context.
									Prioritize smarter with Acme Inc.
								</p>
							</div>
							<div className="bg-muted relative aspect-square size-full overflow-hidden rounded-lg">
								<Image
									className="object-cover"
									alt="Intelligent Prioritization"
									src="https://tweakcn.com/examples/marketing/benefit-1.webp"
									fill
								/>
							</div>
						</div>
					</div>
					<div
						data-orientation="vertical"
						role="none"
						data-slot="separator"
						className="bg-border hidden h-full w-px shrink-0 md:block"
					/>
					<div
						data-orientation="horizontal"
						role="none"
						data-slot="separator"
						className="bg-border h-px w-full shrink-0 md:hidden"
					/>
					<div className="@container/benefit-card">
						<div className="flex flex-col gap-5 py-5 @xl/benefit-card:gap-6 lg:py-9">
							<div className="flex flex-1 flex-col gap-1.5">
								<h3 className="text-3xl font-medium tracking-tight">
									Effortless Integration
								</h3>
								<p className="text-muted-foreground text-lg">
									Acme Inc. connects seamlessly with the tools
									your team already uses, so there's no steep
									learning curve or disruption.
								</p>
							</div>
							<div className="bg-muted relative aspect-square size-full overflow-hidden rounded-lg">
								<Image
									className="object-cover"
									alt="Effortless Integration"
									src="https://tweakcn.com/examples/marketing/benefit-2.webp"
									fill
								/>
							</div>
						</div>
					</div>
				</div>
				<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-9">
					<div className="flex max-w-xl flex-col gap-3">
						<h3 className="flex items-center gap-2 text-lg font-medium tracking-tight text-balance">
							<ActivityIcon className="size-6 shrink-0" />
							Smarter Analytics
						</h3>
						<p className="text-muted-foreground text-base text-pretty">
							Turn data into clarity with AI-powered insights that
							help you act faster and more confidently.
						</p>
					</div>
					<div className="flex max-w-xl flex-col gap-3">
						<h3 className="flex items-center gap-2 text-lg font-medium tracking-tight text-balance">
							<WorkflowIcon className="size-6 shrink-0" />
							Seamless Workflow
						</h3>
						<p className="text-muted-foreground text-base text-pretty">
							Stay in the zone without constant context switching
							across apps and tools.
						</p>
					</div>
					<div className="flex max-w-xl flex-col gap-3">
						<h3 className="flex items-center gap-2 text-lg font-medium tracking-tight text-balance">
							<Users2Icon className="size-6 shrink-0" />
							Team Alignment
						</h3>
						<p className="text-muted-foreground text-base text-pretty">
							Keep everyone on the same page with a single source
							of truth for projects and decisions.
						</p>
					</div>
					<div className="flex max-w-xl flex-col gap-3">
						<h3 className="flex items-center gap-2 text-lg font-medium tracking-tight text-balance">
							<DatabaseIcon className="size-6 shrink-0" />
							Clear Decision Support
						</h3>
						<p className="text-muted-foreground text-base text-pretty">
							When projects stall, it's rarely because of lack of
							effort, it's lack of clarity. Acme Inc. provides
							AI-driven insights.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
};

export default Solutions;
