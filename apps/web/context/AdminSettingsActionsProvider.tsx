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

type PageAction = {
	label: string;
	run: () => void;
};

type AdminSettingsActionsContextValue = {
	hasAction: boolean;
	actionLabel: string | null;
	runAction: () => void;
	registerAction: (action: PageAction | null) => void;
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
	const actionRef = useRef<PageAction | null>(null);
	const bulkRef = useRef<BulkHandlers | null>(null);
	const [hasAction, setHasAction] = useState(false);
	const [actionLabel, setActionLabel] = useState<string | null>(null);
	const [hasBulk, setHasBulk] = useState(false);

	const registerAction = useCallback((action: PageAction | null) => {
		actionRef.current = action;
		setHasAction(action != null);
		setActionLabel(action?.label ?? null);
	}, []);

	const runAction = useCallback(() => {
		actionRef.current?.run();
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
		if (!handlers) {
			return;
		}
		if (key === "cancel-failed") {
			void handlers.cancelFailed?.();
			return;
		}
		void handlers.retryFailed?.();
	}, []);

	const value = useMemo(
		() => ({
			hasAction,
			actionLabel,
			runAction,
			registerAction,
			hasBulk,
			runBulk,
			registerBulkHandlers,
		}),
		[
			hasAction,
			actionLabel,
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

export function useSettingsPageAction(handler: () => void, label = "Create") {
	const { registerAction } = useAdminSettingsActions();
	const handlerRef = useRef(handler);

	useEffect(() => {
		handlerRef.current = handler;
	});

	useEffect(() => {
		registerAction({
			label,
			run: () => handlerRef.current(),
		});
		return () => registerAction(null);
	}, [registerAction, label]);
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
