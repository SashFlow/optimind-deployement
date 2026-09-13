"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import React from "react";

const contactDetails: {
	icon: typeof MailIcon;
	label: string;
	value: string;
	href?: string;
}[] = [
	{
		icon: MailIcon,
		label: "Email",
		value: "growth@sashflow.com",
		href: "mailto:growth@sashflow.com",
	},
	{
		icon: PhoneIcon,
		label: "Phone",
		value: "+91 73059 72149",
		href: "tel:+917305972149",
	},
	{
		icon: MapPinIcon,
		label: "Office",
		value: "1302, Alliance Bhaskar, Navy Colony, Mamlatdar Wadi, Malad (W), Mumbai, India - 400064",
	},
];
const Contact = () => {
	return (
		<section id="contact" className="py-12 lg:py-20">
			<div className="mx-auto flex max-w-7xl flex-col gap-12 px-5 lg:gap-16 lg:px-8">
				<div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
					<div className="flex flex-col gap-9">
						<div className="flex w-full max-w-3xl flex-col items-start gap-3 text-left">
							<span className="text-primary text-base font-medium">
								Contact
							</span>
							<h2 className="text-3xl font-medium tracking-tight text-balance lg:text-4xl">
								Let's talk about your next project
							</h2>
							<p className="text-muted-foreground max-w-2xl text-base text-pretty">
								Have a question or want a demo? Reach out and
								our team will get back to you within one
								business day.
							</p>
						</div>
						<ul className="flex flex-col gap-6">
							{contactDetails.map(
								({ icon: Icon, label, value, href }) => (
									<li
										key={label}
										className="flex items-start gap-4"
									>
										<div className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-lg border">
											<Icon className="text-primary size-5" />
										</div>
										<div className="flex flex-col gap-1">
											<span className="text-sm font-medium">
												{label}
											</span>
											{href ? (
												<a
													href={href}
													className="text-muted-foreground text-base text-pretty hover:underline"
												>
													{value}
												</a>
											) : (
												<span className="text-muted-foreground text-base text-pretty">
													{value}
												</span>
											)}
										</div>
									</li>
								),
							)}
						</ul>
					</div>

					<form
						className="bg-card flex flex-col gap-5 rounded-xl border p-5 lg:p-9"
						onSubmit={(event) => event.preventDefault()}
					>
						<div className="grid gap-5 sm:grid-cols-2">
							<div className="flex flex-col gap-2">
								<Label htmlFor="contact-name">Name</Label>
								<Input
									id="contact-name"
									name="name"
									placeholder="Jane Doe"
									autoComplete="name"
									required
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="contact-email">Email</Label>
								<Input
									id="contact-email"
									name="email"
									type="email"
									placeholder="jane@company.com"
									autoComplete="email"
									required
								/>
							</div>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="contact-company">Company</Label>
							<Input
								id="contact-company"
								name="company"
								placeholder="Acme Inc."
								autoComplete="organization"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="contact-message">Message</Label>
							<Textarea
								id="contact-message"
								name="message"
								placeholder="Tell us a bit about what you're looking for..."
								className="min-h-32 rounded-xl resize-none border border-muted-background"
								required
							/>
						</div>
						<div className="flex justify-end">
							<Button type="submit" className="w-full sm:w-fit">
								Send message
							</Button>
						</div>
					</form>
				</div>
			</div>
		</section>
	);
};

export default Contact;
