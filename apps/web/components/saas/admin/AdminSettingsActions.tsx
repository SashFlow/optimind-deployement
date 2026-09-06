"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

export type BulkActionKey = "cancel-failed" | "retry-failed";

type BulkHandlers = {
	cancelFailed?: () => void | Promise<void>;
	retryFailed?: () => void | Promise<void>;
};

type AdminSettingsActionsContextValue = {
	hasAction: boolean;
	runAction: () => void;
	registerAction: (handler: (() => void) | null) => void;
	hasBulk: boolean;
	runBulk: (key: BulkActionKey) => void;
	registerBulkHandlers: (handlers: BulkHandlers | null) => void;
};

const AdminSettingsActionsContext =
	createContext<AdminSettingsActionsContextValue | null>(null);

export function AdminSettingsActionsProvider({
	children,
}: {
	children: ReactNode;
}) {
	const actionRef = useRef<(() => void) | null>(null);
	const bulkRef = useRef<BulkHandlers | null>(null);
	const [hasAction, setHasAction] = useState(false);
	const [hasBulk, setHasBulk] = useState(false);

	const registerAction = useCallback((handler: (() => void) | null) => {
		actionRef.current = handler;
		setHasAction(handler != null);
	}, []);

	const runAction = useCallback(() => {
		actionRef.current?.();
	}, []);

	const registerBulkHandlers = useCallback(
		(handlers: BulkHandlers | null) => {
			bulkRef.current = handlers;
			setHasBulk(
				handlers != null &&
				(handlers.cancelFailed != null ||
					handlers.retryFailed != null),
			);
		},
		[],
	);

	const runBulk = useCallback((key: BulkActionKey) => {
		const handlers = bulkRef.current;
		if (!handlers) return;
		if (key === "cancel-failed") {
			void handlers.cancelFailed?.();
			return;
		}
		void handlers.retryFailed?.();
	}, []);

	const value = useMemo(
		() => ({
			hasAction,
			runAction,
			registerAction,
			hasBulk,
			runBulk,
			registerBulkHandlers,
		}),
		[
			hasAction,
			runAction,
			registerAction,
			hasBulk,
			runBulk,
			registerBulkHandlers,
		],
	);

	return (
		<AdminSettingsActionsContext.Provider value={value}>
			{children}
		</AdminSettingsActionsContext.Provider>
	);
}

export function useAdminSettingsActions() {
	const context = useContext(AdminSettingsActionsContext);
	if (!context) {
		throw new Error(
			"useAdminSettingsActions must be used within AdminSettingsActionsProvider",
		);
	}
	return context;
}

export function useSettingsPageAction(handler: () => void) {
	const { registerAction } = useAdminSettingsActions();
	const handlerRef = useRef(handler);

	useEffect(() => {
		handlerRef.current = handler;
	});

	useEffect(() => {
		registerAction(() => handlerRef.current());
		return () => registerAction(null);
	}, [registerAction]);
}

export function useSettingsBulkActions(handlers: BulkHandlers) {
	const { registerBulkHandlers } = useAdminSettingsActions();
	const handlersRef = useRef(handlers);

	useEffect(() => {
		handlersRef.current = handlers;
	});

	useEffect(() => {
		registerBulkHandlers({
			cancelFailed: () => handlersRef.current.cancelFailed?.(),
			retryFailed: () => handlersRef.current.retryFailed?.(),
		});
		return () => registerBulkHandlers(null);
	}, [registerBulkHandlers]);
}
