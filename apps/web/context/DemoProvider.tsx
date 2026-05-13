"use client";

import { createContext, type ReactNode, useContext } from "react";

type DemoContextValue = {
	mode: string;
	scenario: any;
};

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

type DemoProviderProps = {
	children: ReactNode;
	slug: string;
};

export function DemoProvider({ children, slug }: DemoProviderProps) {
    const mode = "avatar"; // default mode
    const scenario = ""; // scenario is determined by the slug

    // TODO: will call an API to decode the slug into scenario details. For now, we will hardcode it based on the slug.
	return (
		<DemoContext.Provider value={{ mode, scenario }}>{children}</DemoContext.Provider>
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
