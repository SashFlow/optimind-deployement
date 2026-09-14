import { Button } from "@repo/ui/button";
import {
	CodeXmlIcon,
	DollarSignIcon,
	Hand,
	LockIcon,
	SparklesIcon,
	UserIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React from "react";

const faqs = [
	{
		icon: SparklesIcon,
		question: "What is Optimind by Sashflow?",
		answer: "Optimind by Sashflow is a voice AI platform for insurance and healthcare organisations in India. It turns complex workflows—like MER calls, claims updates, health-report explanations, patient intake, and post-discharge follow-ups—into natural voice conversations that scale with demand.",
	},
	{
		icon: UserIcon,
		question: "Who is Optimind built for?",
		answer: "Insurers, TPAs, hospitals, and healthcare teams that need consistent, high-volume voice conversations—policy clarification, claims status, medical-exam reminders, appointment scheduling, feedback calls, hospital navigation, and chronic-care check-ins—without growing call teams linearly.",
	},
	{
		icon: DollarSignIcon,
		question: "How does pricing work?",
		answer: "Optimind uses a pay-as-you-go model so you can scale calling capacity during application peaks, claim surges, or seasonal demand—without permanently staffing for your highest-volume period. Talk to us for a plan sized to your use case and call volumes.",
	},
	{
		icon: CodeXmlIcon,
		question: "Is this a generic chatbot that speaks?",
		answer: "No. Each Optimind agent is configured around your approved information, terminology, conversation flows, escalation rules, and communication standards. Models can be tuned with representative recordings so the experience reflects how Indian policyholders and patients actually ask questions and respond.",
	},
	{
		icon: Hand,
		question: "What happens when a call needs a human?",
		answer: "Optimind handles routine conversations at scale and hands off when the configured workflow calls for it—sensitive cases, exceptions, underwriting decisions, or clinical attention. AI covers the repetitive work; your teams focus on what needs people.",
	},
	{
		icon: LockIcon,
		question: "How is our data and compliance handled?",
		answer: "Optimind agents are designed around your organisation’s approved content and workflows—not open-ended answers. Conversations follow your escalation paths and communication standards, so members and patients get consistent, controlled information aligned with how your insurance or healthcare operations already work.",
	},
] as const;

const avatars = [
	"https://tweakcn.com/examples/avatars/cartoon-2.webp",
	"https://tweakcn.com/examples/avatars/cartoon-3.webp",
	"https://tweakcn.com/examples/avatars/cartoon-4.webp",
] as const;

const Faq = () => {
	const router = useRouter();
	return (
		<section id="faq" className="py-12 lg:py-20">
			<div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 lg:gap-16 lg:px-8">
				<div className="flex w-full max-w-3xl flex-col items-start gap-3 text-left">
					<span className="text-primary text-base font-medium">
						Support
					</span>
					<h2 className="text-3xl font-medium tracking-tight text-balance lg:text-4xl">
						Frequently Asked Questions
					</h2>
				</div>

				<div className="grid gap-y-12 md:grid-cols-2 md:gap-9 lg:grid-cols-3">
					{faqs.map(({ icon: Icon, question, answer }) => (
						<div
							key={question}
							className="flex max-w-xl flex-col items-start gap-4 text-left"
						>
							<div className="bg-muted flex size-16 shrink-0 items-center justify-center rounded-lg border">
								<Icon className="text-primary size-6" />
							</div>
							<div className="flex flex-col gap-1">
								<h3 className="text-xl font-medium tracking-tight text-balance">
									{question}
								</h3>
								<p className="text-muted-foreground text-base text-pretty">
									{answer}
								</p>
							</div>
						</div>
					))}
				</div>

				<div className="bg-background flex flex-col items-center gap-9 rounded-xl border px-5 py-9 lg:px-9">
					<div className="flex -space-x-2">
						{avatars.map((src, index) => (
							<span
								key={src}
								className="ring-background relative flex size-8 shrink-0 overflow-hidden rounded-full ring-2 grayscale select-none"
							>
								<Image
									alt={`Avatar ${index + 2}`}
									className="aspect-square size-full object-cover"
									height={32}
									src={src}
									width={32}
								/>
							</span>
						))}
					</div>
					<div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 text-center">
						<h2 className="text-3xl font-medium tracking-tight text-balance lg:text-4xl">
							Want to know more?
						</h2>
						<p className="text-muted-foreground max-w-2xl text-base text-pretty">
							Our team is here to help you get the answers you
							need.
						</p>
					</div>
					<Button
						className="max-sm:w-full"
						onClick={() => router.push("#contact")}
					>
						Get in touch
					</Button>
				</div>
			</div>
		</section>
	);
};

export default Faq;
