"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

import { orpcClient } from "@shared/lib/orpc-client";
import { DemoLinks } from "@repo/database/prisma/generated/client/client";

type DemoContextValue = {
	usecase: DemoLinks | null;
	loading: boolean;
};

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

type DemoProviderProps = {
	children: ReactNode;
	slug: string;
};

export function DemoProvider({
	children,
	slug,
}: DemoProviderProps) {
	const [usecase, setUsecase] = useState<DemoLinks | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const getConfig = async () => {
			try {
				const response = await orpcClient.links.validate({
					token: slug,
				});

				if (response) {
					setUsecase(response);
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
			}}
		>
			{children}
		</DemoContext.Provider>
	);
}

export function useDemoContext() {
	const context = useContext(DemoContext);

	if (!context) {
		throw new Error(
			"useDemoContext must be used within DemoProvider"
		);
	}

	return context;
}

export default DemoProvider;