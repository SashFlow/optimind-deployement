"use client";

import { WelcomeImage } from "@components/app/welcome-view";
import {
	demoPersonas,
	modes,
	popularIndianLanguages,
	scenariosOptions,
} from "@constants";
import { Button } from "@repo/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/card";
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
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

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

type Mode = (typeof modes)[number]["id"];

function AudioWaveformPreview() {
	return (
		<div className="bg-muted/40 flex aspect-3/2 w-full items-center justify-center gap-1 rounded-lg border px-4 py-3">
			<WelcomeImage />
		</div>
	);
}

const PlaygroundPage = () => {
	const router = useRouter();
	const [selectedMode, setSelectedMode] = useState<Mode>("avatar");
	const [selectedScenario, setSelectedScenario] = useState(
		"medical-examination",
	);
	const [selectedAgentSlug, setSelectedAgentSlug] = useState<string | null>(
		null,
	);
	const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
	const [selectedLanguage, setSelectedLanguage] = useState<string>("English");

	useEffect(() => {
		if (selectedScenario === "medical-examination") {
			setSelectedPersona(null);
			return;
		}

		const randomPersona =
			demoPersonas[Math.floor(Math.random() * demoPersonas.length)];
		setSelectedPersona(randomPersona?.full_name ?? null);
	}, [selectedScenario]);

	const selectedPersonaData = demoPersonas.find(
		(p) => p.full_name === selectedPersona,
	);
	const personaQuery = selectedPersonaData
		? `&selectedPersona=${selectedPersonaData.phone_number}`
		: "";

	const nextHref =
		selectedAgentSlug == null ||
		(selectedScenario !== "medical-examination" && !selectedPersona)
			? null
			: `${selectedMode}/${selectedScenario}?language=${selectedLanguage}&selectedAgent=${selectedAgentSlug}${personaQuery}`;

	return (
		<main className="bg-background flex flex-1 h-full px-4 py-32 md:px-8">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Playground</CardTitle>
						<CardDescription>
							Configure and launch an assistant session directly.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Mode selector */}
						<div className="flex-col flex sm:flex-row justify-between gap-4">
							<div className="flex gap-2">
								{modes.map((mode) => (
									<Button
										key={mode.id}
										variant={
											selectedMode === mode.id
												? "default"
												: "outline"
										}
										size="sm"
										onClick={() => {
											setSelectedMode(mode.id);
											setSelectedAgentSlug(null);
										}}
										className="w-full"
									>
										{mode.label}
									</Button>
								))}
							</div>
							<div className="flex gap-2">
								<Select
									value={selectedScenario}
									onValueChange={setSelectedScenario}
								>
									<SelectTrigger className="w-full sm:w-[218px]">
										<SelectValue placeholder="Select a use-case" />
									</SelectTrigger>
									<SelectContent>
										{scenariosOptions.map(
											(option: {
												title: string;
												slug: string;
											}) => (
												<SelectItem
													key={option.title}
													value={option.slug}
												>
													{option.title}
												</SelectItem>
											),
										)}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Agent selector */}
						<div className="grid gap-4 sm:grid-cols-2">
							{agents.map((agent) => {
								const isSelected =
									agent.name === selectedAgentSlug;
								return (
									<Card
										key={agent.name}
										className={
											isSelected
												? "border-primary ring-primary/20 ring-2"
												: undefined
										}
									>
										<CardHeader className="space-y-3 pb-3">
											{selectedMode === "audio" ? (
												<AudioWaveformPreview />
											) : (
												<div className="bg-muted/40 flex aspect-3/2 w-full items-center justify-center rounded-lg border">
													{agent.icon}
												</div>
											)}
											<CardTitle className="text-center text-sm">
												Dr. {agent.name}
											</CardTitle>
										</CardHeader>
										<CardContent className="pt-0">
											<Button
												className="w-full"
												size="sm"
												variant={
													isSelected
														? "default"
														: "outline"
												}
												onClick={() =>
													setSelectedAgentSlug(
														agent.name,
													)
												}
											>
												{isSelected
													? "Selected"
													: "Select"}
											</Button>
										</CardContent>
									</Card>
								);
							})}
						</div>

						{/* Language + Persona + Proceed */}
						<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
							<div className="flex flex-col gap-4 sm:flex-row">
								<div className="space-y-1.5">
									<Select
										value={selectedLanguage}
										onValueChange={setSelectedLanguage}
									>
										<SelectTrigger className="w-full sm:w-[218px]">
											<SelectValue placeholder="Select a language" />
										</SelectTrigger>
										<SelectContent>
											{popularIndianLanguages.map(
												(language) => (
													<SelectItem
														key={language}
														value={language}
													>
														{language}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</div>

								{selectedScenario !== "medical-examination" && (
									<div className="flex h-10 min-w-[218px] items-center rounded-md border px-3 text-sm text-muted-foreground">
										Persona: {selectedPersona ?? "Random"}
									</div>
								)}
							</div>

							{nextHref ? (
								<Button
									className="w-full sm:w-auto"
									onClick={() => router.push(nextHref)}
								>
									Proceed
								</Button>
							) : (
								<Button className="w-full sm:w-auto" disabled>
									Proceed
								</Button>
							)}
						</div>
					</CardContent>
				</Card>
			</div>
		</main>
	);
};

export default PlaygroundPage;
