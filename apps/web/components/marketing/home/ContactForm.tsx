"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	type ContactFormValues,
	contactFormSchema,
} from "@repo/api/modules/contact/types";
import { Alert, AlertTitle } from "@repo/ui/alert";
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
import { Textarea } from "@repo/ui/textarea";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { MailCheckIcon, MailIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";

export function ContactForm() {
	const t = useTranslations();
	const contactFormMutation = useMutation(
		orpc.contact.submit.mutationOptions(),
	);

	const form = useForm<ContactFormValues>({
		resolver: zodResolver(contactFormSchema),
		defaultValues: {
			name: "",
			email: "",
			message: "",
		},
	});

	const onSubmit = form.handleSubmit(async (values) => {
		try {
			await contactFormMutation.mutateAsync(values);
		} catch {
			form.setError("root", {
				message: t("contact.form.notifications.error"),
			});
		}
	});

	return (
		<div>
			{form.formState.isSubmitSuccessful ? (
				<Alert variant="success">
					<MailCheckIcon />
					<AlertTitle>
						{t("contact.form.notifications.success")}
					</AlertTitle>
				</Alert>
			) : (
				<Form {...form}>
					<form
						onSubmit={onSubmit}
						className="flex flex-col items-stretch gap-4"
					>
						{form.formState.errors.root?.message && (
							<Alert variant="destructive">
								<MailIcon />
								<AlertTitle>
									{form.formState.errors.root.message}
								</AlertTitle>
							</Alert>
						)}

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="mb-1">
										{t("contact.form.name")}
									</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="mb-1">
										{t("contact.form.email")}
									</FormLabel>
									<FormControl>
										<Input {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="message"
							render={({ field }) => (
								<FormItem>
									<FormLabel className="mb-1">
										{t("contact.form.message")}
									</FormLabel>
									<FormControl>
										<Textarea {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button
							type="submit"
							className="w-full"
							loading={form.formState.isSubmitting}
						>
							{t("contact.form.submit")}
						</Button>
					</form>
				</Form>
			)}
		</div>
	);
}
