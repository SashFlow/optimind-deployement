"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

type AppHeaderContextValue = {
	breadcrumb: ReactNode | null;
	setBreadcrumb: (breadcrumb: ReactNode | null) => void;
	actions: ReactNode | null;
	setActions: (actions: ReactNode | null) => void;
	/**
	 * When true, hide the floating mobile top cluster + bottom nav
	 * (e.g. during an in-app preview call).
	 */
	mobileChromeHidden: boolean;
	setMobileChromeHidden: (hidden: boolean) => void;
};

const AppHeaderContext = createContext<AppHeaderContextValue | null>(null);

export function AppHeaderProvider({ children }: { children: ReactNode }) {
	const [breadcrumb, setBreadcrumbState] = useState<ReactNode | null>(null);
	const [actions, setActionsState] = useState<ReactNode | null>(null);
	const [mobileChromeHidden, setMobileChromeHiddenState] = useState(false);

	const setBreadcrumb = useCallback((next: ReactNode | null) => {
		setBreadcrumbState(next);
	}, []);

	const setActions = useCallback((next: ReactNode | null) => {
		setActionsState(next);
	}, []);

	const setMobileChromeHidden = useCallback((hidden: boolean) => {
		setMobileChromeHiddenState(hidden);
	}, []);

	const value = useMemo(
		() => ({
			breadcrumb,
			setBreadcrumb,
			actions,
			setActions,
			mobileChromeHidden,
			setMobileChromeHidden,
		}),
		[
			breadcrumb,
			setBreadcrumb,
			actions,
			setActions,
			mobileChromeHidden,
			setMobileChromeHidden,
		],
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

/** Optional: returns null outside the app shell (share/embed pages). */
export function useOptionalAppHeader() {
	return useContext(AppHeaderContext);
}
