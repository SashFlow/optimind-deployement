"use client";

import { cn } from "@repo/ui/utils";
import { motion } from "framer-motion";
import {
	BellIcon,
	Building2Icon,
	CalendarIcon,
	HeadsetIcon,
	HeartPulseIcon,
	MailIcon,
	MessageCircleIcon,
	PhoneIcon,
	type LucideIcon,
} from "lucide-react";
import Image from "next/image";

type Integration = {
	name: string;
	icon: LucideIcon;
	tone: string;
	position: string;
	iconRotate?: string;
	orientation:
		| "vertical"
		| "vertical-reverse"
		| "horizontal"
		| "horizontal-reverse";
};

const integrations: Integration[] = [
	{
		name: "WhatsApp",
		icon: MessageCircleIcon,
		tone: "bg-green-600/10 dark:bg-green-400/10 text-green-700 dark:text-green-400",
		position: "absolute top-0 left-1/2 -translate-x-1/2",
		orientation: "vertical",
	},
	{
		name: "Phone",
		icon: PhoneIcon,
		tone: "bg-sky-600/10 dark:bg-sky-400/10 text-sky-700 dark:text-sky-400",
		position:
			"absolute top-15 left-9 origin-top -rotate-47 lg:max-xl:top-14 lg:max-xl:left-0 lg:max-xl:-rotate-41",
		iconRotate: "rotate-45",
		orientation: "vertical",
	},
	{
		name: "Calendar",
		icon: CalendarIcon,
		tone: "bg-amber-600/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400",
		position:
			"absolute top-15 right-9 origin-top rotate-47 lg:max-xl:top-14 lg:max-xl:right-0 lg:max-xl:rotate-41",
		iconRotate: "-rotate-45",
		orientation: "vertical",
	},
	{
		name: "CRM",
		icon: HeadsetIcon,
		tone: "bg-destructive/10 text-destructive",
		position: "absolute top-1/2 right-0 -translate-y-1/2",
		orientation: "horizontal-reverse",
	},
	{
		name: "Email",
		icon: MailIcon,
		tone: "bg-amber-600/10 dark:bg-amber-400/10 text-amber-700 dark:text-amber-400",
		position:
			"absolute right-28 bottom-7 rotate-135 lg:max-xl:right-18 lg:max-xl:rotate-142",
		iconRotate: "rotate-224",
		orientation: "vertical",
	},
	{
		name: "EHR / HIS",
		icon: HeartPulseIcon,
		tone: "bg-sky-600/10 dark:bg-sky-400/10 text-sky-700 dark:text-sky-400",
		position: "absolute bottom-0 left-1/2 -translate-x-1/2",
		orientation: "vertical-reverse",
	},
	{
		name: "Hospitals",
		icon: Building2Icon,
		tone: "bg-primary/10 text-primary",
		position:
			"absolute bottom-7 left-28 -rotate-135 lg:max-xl:left-18 lg:max-xl:-rotate-142",
		iconRotate: "rotate-135",
		orientation: "vertical",
	},
	{
		name: "Reminders",
		icon: BellIcon,
		tone: "bg-destructive/10 text-destructive",
		position: "absolute top-1/2 left-0 -translate-y-1/2",
		orientation: "horizontal",
	},
];

function Pulse({
	className,
	animate,
}: {
	className: string;
	animate: Record<string, string[]>;
}) {
	return (
		<motion.span
			aria-hidden
			className={cn("to-primary absolute from-transparent", className)}
			animate={animate}
			transition={{
				duration: 2.4,
				repeat: Number.POSITIVE_INFINITY,
				ease: "linear",
			}}
		/>
	);
}

function IntegrationNode({ item }: { item: Integration }) {
	const Icon = item.icon;

	const avatar = (
		<span
			className={cn(
				"relative z-2 flex size-12 items-center justify-center rounded-full p-2.5",
				item.tone,
				item.iconRotate,
			)}
		>
			<Icon className="size-5" aria-hidden />
			<span className="sr-only">{item.name}</span>
		</span>
	);

	if (item.orientation === "horizontal") {
		return (
			<div className={item.position}>
				<div className="relative flex items-center">
					{avatar}
					<div className="bg-background absolute -left-2 z-1 size-16 rounded-full" />
					<div className="relative h-0.5 w-40">
						<div className="border-border absolute inset-0 border-t-2 border-dashed" />
						<Pulse
							className="top-0 left-0 h-0.5 w-6 bg-linear-to-r"
							animate={{ left: ["0%", "70%", "0%"] }}
						/>
					</div>
				</div>
			</div>
		);
	}

	if (item.orientation === "horizontal-reverse") {
		return (
			<div className={item.position}>
				<div className="relative flex items-center">
					<div className="relative h-0.5 w-40">
						<div className="border-border absolute inset-0 border-t-2 border-dashed" />
						<Pulse
							className="top-0 right-0 h-0.5 w-6 bg-linear-to-l"
							animate={{ right: ["0%", "70%", "0%"] }}
						/>
					</div>
					{avatar}
					<div className="bg-background absolute -right-2 z-1 size-16 rounded-full" />
				</div>
			</div>
		);
	}

	if (item.orientation === "vertical-reverse") {
		return (
			<div className={item.position}>
				<div className="relative flex flex-col-reverse items-center">
					{avatar}
					<div className="bg-background absolute -bottom-2 z-1 size-16 rounded-full" />
					<div className="relative h-40 w-0.5">
						<div className="border-border absolute inset-0 border-l-2 border-dashed" />
						<Pulse
							className="bottom-0 left-0 h-6 w-0.5 bg-linear-to-t"
							animate={{ bottom: ["0%", "70%", "0%"] }}
						/>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={item.position}>
			<div className="relative flex flex-col items-center">
				{avatar}
				<div className="bg-background absolute -top-2 z-1 size-16 rounded-full" />
				<div className="relative h-40 w-0.5">
					<div className="border-border absolute inset-0 border-l-2 border-dashed" />
					<Pulse
						className="top-0 left-0 h-6 w-0.5 bg-linear-to-b"
						animate={{ top: ["0%", "70%", "0%"] }}
					/>
				</div>
			</div>
		</div>
	);
}

export function IntegrationsHub() {
	return (
		<div className="relative flex size-full max-w-115 items-center justify-center max-lg:mx-auto">
			<div className="bg-accent relative z-10 flex size-23 flex-col items-center justify-center gap-2 rounded-lg border-3 shadow-[inset_0_0_15px_color-mix(in_oklab,var(--primary)60%,transparent)] md:size-29">
				<Image
					src="/images/logo.svg"
					alt="Optimind"
					width={40}
					height={40}
					className="size-8 md:size-10"
				/>
				<Image
					src="/images/optimind.svg"
					alt="Optimind"
					width={40}
					height={40}
					className="size-8 md:size-10"
				/>
			</div>

			{integrations.map((item) => (
				<IntegrationNode key={item.name} item={item} />
			))}
		</div>
	);
}
