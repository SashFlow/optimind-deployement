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
import React from "react";

const faqs = [
	{
		icon: SparklesIcon,
		question: "What is Acme AI?",
		answer: "Acme AI is a personal AI workspace that helps individuals and teams cut context switching, gain clarity, and complete projects faster.",
	},
	{
		icon: UserIcon,
		question: "Who is Acme AI for?",
		answer: "It's built for creators, teams, and businesses of all sizes who want to streamline their workflow and make smarter decisions.",
	},
	{
		icon: DollarSignIcon,
		question: "How much does it cost?",
		answer: "We offer flexible one-time plans starting at 199 USD. See our pricing section for details.",
	},
	{
		icon: CodeXmlIcon,
		question: "Do I need technical skills to use Acme AI?",
		answer: "Not at all. Acme AI is designed to work out of the box with minimal setup, and integrates with the tools you already use.",
	},
	{
		icon: Hand,
		question: "Can I try it before I buy?",
		answer: "Yes — we offer a demo so you can see how Acme AI fits into your workflow.",
	},
	{
		icon: LockIcon,
		question: "How does Acme AI handle my data?",
		answer: "Your privacy and security are our top priority. All data is encrypted and never shared with third parties.",
	},
] as const;

const avatars = [
	"https://tweakcn.com/examples/avatars/cartoon-2.webp",
	"https://tweakcn.com/examples/avatars/cartoon-3.webp",
	"https://tweakcn.com/examples/avatars/cartoon-4.webp",
] as const;

const Faq = () => {
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
					<Button className="max-sm:w-full">Get in touch</Button>
				</div>
			</div>
		</section>
	);
};

export default Faq;
