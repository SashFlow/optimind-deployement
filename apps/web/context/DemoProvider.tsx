"use client";

import type { DemoLinks } from "@repo/database/prisma/generated/client/client";

import { orpcClient } from "@shared/lib/orpc-client";
import {
	createContext,
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useContext,
	useEffect,
	useState,
} from "react";

type DemoPersona = {
	phone_number: string;
	full_name: string;
	dob: string;
};

const demoPersonas: readonly DemoPersona[] = [
	{
		phone_number: "9876543210",
		full_name: "Rohit Sharma",
		dob: "1992-08-15",
	},
	{
		phone_number: "9876500001",
		full_name: "Priya Nair",
		dob: "1995-01-20",
	},
];

type DemoContextValue = {
	usecase: DemoLinks | null;
	activeUsecase: string | null;
	slugs?: string[];
	setActiveUsecase: (active: string) => void;
	personas: readonly DemoPersona[];
	selectedPersonaPhone: string | null;
	selectedPersona: DemoPersona | null;
	setSelectedPersonaPhone: Dispatch<SetStateAction<string | null>>;
	loading: boolean;
};

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

type DemoProviderProps = {
	children: ReactNode;
	slug: string;
};

export function DemoProvider({ children, slug }: DemoProviderProps) {
	const [usecase, setUsecase] = useState<DemoLinks | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeUsecase, setActiveUsecase] = useState<string | null>(null);
	const [selectedPersonaPhone, setSelectedPersonaPhone] = useState<
		string | null
	>(null);
	const selectedPersona =
		demoPersonas.find(
			(persona) => persona.phone_number === selectedPersonaPhone,
		) ?? null;

	useEffect(() => {
		const getConfig = async () => {
			try {
				const response = await orpcClient.links.validate({
					token: slug,
				});

				if (response) {
					setUsecase(response);
					setActiveUsecase(response.slug);
				}
			} catch (error) {
				console.error("Failed to load demo config", error);
			} finally {
				setLoading(false);
			}
		};

		getConfig();
	}, [slug]);

	return (
		<DemoContext.Provider
			value={{
				usecase,
				loading,
				activeUsecase,
				setActiveUsecase,
				personas: demoPersonas,
				selectedPersonaPhone,
				selectedPersona,
				setSelectedPersonaPhone,
				slugs: usecase?.slug.split(","),
			}}
		>
			{children}
		</DemoContext.Provider>
	);
}

export function useDemoContext() {
	const context = useContext(DemoContext);

	if (!context) {
		throw new Error("useDemoContext must be used within DemoProvider");
	}

	return context;
}

export default DemoProvider;
