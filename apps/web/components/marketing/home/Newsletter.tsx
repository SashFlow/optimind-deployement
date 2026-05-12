"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { FadeUp } from "../shared/Motion";

const formSchema = z.object({
	email: z.string().email(),
});
type FormValues = z.infer<typeof formSchema>;

export function Newsletter() {
	const t = useTranslations();
	const newsletterSignupMutation = useMutation(
		orpc.newsletter.subscribe.mutationOptions(),
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
	});

	const onSubmit = form.handleSubmit(async ({ email }) => {
		try {
			await newsletterSignupMutation.mutateAsync({ email });
		} catch {
			form.setError("email", {
				message: t("newsletter.hints.error.message"),
			});
		}
	});

	return (
		<section className="py-32 px-8" id="contact">
			<FadeUp className="max-w-7xl mx-auto bg-primary p-16 md:p-32 relative overflow-hidden">
				<div className="relative z-10 text-center lg:text-left grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
					<div>
						<h2 className="editorial-headline text-primary-foreground text-5xl md:text-7xl mb-8 uppercase">
							Let's Build Something That Serves an Entire Industry
						</h2>
						<a
							className="font-approachable text-2xl text-tertiary-fixed font-bold hover:underline decoration-2 underline-offset-8"
							href="mailto:hello@sashflow.com"
						>
							hello@sashflow.com
						</a>
					</div>
					<div className="flex justify-center lg:justify-end">
						<Link
							href="/contact"
							className="bg-primary-foreground text-primary px-12 py-6 font-approachable font-black uppercase text-lg tracking-widest hover:bg-surface-bright transition-all shadow-2xl inline-block text-center"
						>
							Get in Touch
						</Link>
					</div>
				</div>
				<div className="absolute top-0 right-0 w-1/2 h-full bg-linear-to-l from-black/20 to-transparent" />
			</FadeUp>
		</section>
	);
}
