"use client";

import { WelcomeImage } from "@components/app/welcome-view";
import { popularIndianLanguages, scenarios } from "@constants";
import { useDemoContext } from "@context/DemoProvider";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import {
	Venus as GenderFemaleIcon,
	Mars as GenderMaleIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const agents = [
	{
		name: "Sanjay",
		url: "/sanjay.mp4",
		icon: <GenderMaleIcon size={48} />,
	},
	{
		name: "Samira",
		url: "/anjali.mp4",
		icon: <GenderFemaleIcon size={48} />,
	},
];

function AudioWaveformPreview() {
	return (
		<div className="bg-muted/40 flex aspect-3/2 w-full items-center justify-center gap-1 rounded-lg border px-4 py-3">
			<WelcomeImage />
		</div>
	);
}

const Step1 = ({
	slugs,
	activeUsecase,
	setActiveUsecase,
	onNext,
}: {
	slugs: string[] | undefined;
	activeUsecase: string | null;
	setActiveUsecase: (active: string) => void;
	onNext: () => void;
}) => {
	const usecases = (slugs ?? []).filter(Boolean);
	const hasSelectedUsecase =
		activeUsecase != null && usecases.includes(activeUsecase);

	return (
		<section className="space-y-6">
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
				{usecases.map((slug) => {
					const isSelected = slug === activeUsecase;
					const scenario =
						slug in scenarios
							? scenarios[slug as keyof typeof scenarios]
							: undefined;
					const title = scenario?.title ?? slug;
					const scenarioImageUrl = scenario?.url;

					return (
						<Card
							key={slug}
							className={
								isSelected
									? "border-primary ring-primary/20 ring-2"
									: undefined
							}
						>
							<CardHeader>
								<CardTitle className="text-base">
									{title}
								</CardTitle>
								<div className="bg-muted/30 flex aspect-3/2 w-full items-center justify-center overflow-hidden rounded-md border p-3">
									{scenarioImageUrl ? (
										<Image
											alt={title}
											className="h-full w-full object-contain"
											height={160}
											src={scenarioImageUrl}
											width={240}
										/>
									) : (
										<p className="text-muted-foreground text-sm">
											Preview unavailable
										</p>
									)}
								</div>
							</CardHeader>
							<CardContent>
								<Button
									className="w-full"
									variant={isSelected ? "default" : "outline"}
									onClick={() => setActiveUsecase(slug)}
								>
									{isSelected ? "Selected" : "Select"}
								</Button>
							</CardContent>
						</Card>
					);
				})}
			</div>

			<div className="flex w-full justify-end">
				<Button
					className="w-full sm:w-auto"
					disabled={!hasSelectedUsecase}
					onClick={onNext}
				>
					Next
				</Button>
			</div>
		</section>
	);
};

const Step2 = ({
	activeUsecase,
	selectedPersonaPhone,
	setSelectedPersonaPhone,
	personas,
	selectedPersonaDetails,
	selectedAgentSlug,
	setSelectedAgentSlug,
	usecase,
	selectedLanguage,
	setSelectedLanguage,
	onNext,
}: {
	activeUsecase: string | null;
	selectedPersonaPhone: string | null;
	setSelectedPersonaPhone: React.Dispatch<
		React.SetStateAction<string | null>
	>;
	personas: readonly {
		phone_number: string;
		full_name: string;
		dob: string;
	}[];
	selectedPersonaDetails: {
		phone_number: string;
		full_name: string;
		dob: string;
	} | null;
	selectedAgentSlug: string | null;
	setSelectedAgentSlug: React.Dispatch<React.SetStateAction<string | null>>;
	usecase: any | null;
	selectedLanguage: string;
	setSelectedLanguage: React.Dispatch<React.SetStateAction<string>>;
	onNext: () => void;
}) => {
	const showPersonaSelection = activeUsecase !== "medical-examination";
	const canContinue = showPersonaSelection
		? !!selectedAgentSlug && !!selectedPersonaPhone
		: !!selectedAgentSlug;

	return (
		<section className="space-y-6">
			<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
				{agents.map((agent) => {
					const isSelected = agent.name === selectedAgentSlug;

					return (
						<Card
							key={agent.name}
							className={
								isSelected
									? "border-primary ring-primary/20 ring-2"
									: undefined
							}
						>
							<CardHeader className="space-y-4">
								{usecase.mode === "audio" ? (
									<AudioWaveformPreview />
								) : (
									<div className="bg-muted/40 flex aspect-3/2 w-full items-center justify-center gap-1 rounded-lg border px-4 py-3">
										{agent.icon}
									</div>
								)}
								<CardTitle className="text-center text-base">
									Dr. {agent.name}
								</CardTitle>
							</CardHeader>
							<CardContent>
								<Button
									className="w-full"
									variant={isSelected ? "default" : "outline"}
									onClick={() =>
										setSelectedAgentSlug(agent.name)
									}
								>
									{isSelected ? "Selected" : "Select"}
								</Button>
							</CardContent>
						</Card>
					);
				})}
			</div>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<div
					className={`grid w-full gap-4 ${showPersonaSelection ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}
				>
					{showPersonaSelection && (
						<div className="space-y-2">
							<p className="text-sm font-medium">Persona</p>
							<Select
								value={selectedPersonaPhone ?? ""}
								onValueChange={setSelectedPersonaPhone}
							>
								<SelectTrigger className="w-full sm:w-[320px]">
									<SelectValue placeholder="Select a persona" />
								</SelectTrigger>
								<SelectContent>
									{personas.map((persona) => (
										<SelectItem
											key={persona.phone_number}
											value={persona.phone_number}
										>
											{persona.full_name} (
											{persona.phone_number})
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{selectedPersonaDetails && (
								<p className="text-muted-foreground text-xs">
									DOB: {selectedPersonaDetails.dob}
								</p>
							)}
						</div>
					)}

					<div className="space-y-2">
						<p className="text-sm font-medium">
							Preferred Language
						</p>
						<Select
							value={selectedLanguage}
							onValueChange={setSelectedLanguage}
						>
							<SelectTrigger className="w-full sm:w-[320px]">
								<SelectValue placeholder="Select a language" />
							</SelectTrigger>
							<SelectContent>
								{popularIndianLanguages.map((language) => (
									<SelectItem key={language} value={language}>
										{language}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<Button
					className="w-full sm:w-auto"
					disabled={!canContinue}
					onClick={onNext}
				>
					Next
				</Button>
			</div>
		</section>
	);
};

const DemoPage = () => {
	const router = useRouter();
	const {
		usecase,
		loading,
		slugs,
		activeUsecase,
		setActiveUsecase,
		personas,
		selectedPersona,
		selectedPersonaPhone,
		setSelectedPersonaPhone,
	} = useDemoContext();
	const [step, setStep] = useState<number>(slugs?.length === 1 ? 2 : 1);
	const [selectedAgentSlug, setSelectedAgentSlug] = useState<string | null>(
		null,
	);
	const [selectedLanguage, setSelectedLanguage] = useState<string>("English");

	if (loading || usecase == null) {
		return null;
	}

	const onNext = () => {
		const params = new URLSearchParams({
			language: selectedLanguage,
			selectedAgent: selectedAgentSlug ?? "",
		});

		if (selectedPersona && activeUsecase !== "medical-examination") {
			params.set("personaPhoneNumber", selectedPersona.phone_number);
			params.set("personaFullName", selectedPersona.full_name);
			params.set("personaDob", selectedPersona.dob);
		}

		const nextHref = `/demo/${usecase.token}/try?${params.toString()}`;

		router.push(nextHref);
	};

	if (usecase.approvedSessions === 0) {
		return <div>Trial period is over</div>;
	}

	return (
		<main className="bg-background min-h-screen">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-10 md:px-10">
				<div className="space-y-3">
					<h1 className="text-4xl font-semibold tracking-tight">
						Sashflow
					</h1>
				</div>
			</div>
			<div className="container">
				{step === 1 && (
					<Step1
						slugs={slugs}
						activeUsecase={activeUsecase}
						setActiveUsecase={setActiveUsecase}
						onNext={() => setStep(2)}
					/>
				)}
				{step === 2 && (
					<Step2
						activeUsecase={activeUsecase}
						selectedPersonaPhone={selectedPersonaPhone}
						setSelectedPersonaPhone={setSelectedPersonaPhone}
						personas={personas}
						selectedPersonaDetails={selectedPersona}
						usecase={usecase}
						selectedAgentSlug={selectedAgentSlug}
						setSelectedAgentSlug={setSelectedAgentSlug}
						selectedLanguage={selectedLanguage}
						setSelectedLanguage={setSelectedLanguage}
						onNext={onNext}
					/>
				)}
			</div>
		</main>
	);
};

export default DemoPage;
