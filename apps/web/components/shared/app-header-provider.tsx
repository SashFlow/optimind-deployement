"use client";

import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from "react";

type AppHeaderContextValue = {
	breadcrumb: ReactNode | null;
	setBreadcrumb: (breadcrumb: ReactNode | null) => void;
	actions: ReactNode | null;
	setActions: (actions: ReactNode | null) => void;
};

const AppHeaderContext = createContext<AppHeaderContextValue | null>(null);

export function AppHeaderProvider({ children }: { children: ReactNode }) {
	const [breadcrumb, setBreadcrumbState] = useState<ReactNode | null>(null);
	const [actions, setActionsState] = useState<ReactNode | null>(null);

	const setBreadcrumb = useCallback((next: ReactNode | null) => {
		setBreadcrumbState(next);
	}, []);

	const setActions = useCallback((next: ReactNode | null) => {
		setActionsState(next);
	}, []);

	const value = useMemo(
		() => ({ breadcrumb, setBreadcrumb, actions, setActions }),
		[breadcrumb, setBreadcrumb, actions, setActions],
	);

	return (
		<AppHeaderContext.Provider value={value}>
			{children}
		</AppHeaderContext.Provider>
	);
}

export function useAppHeader() {
	const context = useContext(AppHeaderContext);
	if (!context) {
		throw new Error("useAppHeader must be used within AppHeaderProvider");
	}
	return context;
}
