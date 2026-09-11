"use client";

import type { Session } from "@repo/auth";
import { authClient } from "@repo/auth/client";
import { useQueryClient } from "@tanstack/react-query";

import React, { type ReactNode, useContext, useEffect, useState } from "react";
import { sessionQueryKey, useSessionQuery } from "@/services/auth";

export const SessionContext = React.createContext<
	| {
			session: Session["session"] | null;
			user: Session["user"] | null;
			loaded: boolean;
			reloadSession: () => Promise<void>;
	  }
	| undefined
>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
	const queryClient = useQueryClient();

	const { data: session } = useSessionQuery();
	const [loaded, setLoaded] = useState(!!session);

	useEffect(() => {
		if (session && !loaded) {
			setLoaded(true);
		}
	}, [session]);

	return (
		<SessionContext.Provider
			value={{
				loaded,
				session: session?.session ?? null,
				user: session?.user ?? null,
				reloadSession: async () => {
					const { data: newSession, error } =
						await authClient.getSession({
							query: {
								disableCookieCache: true,
							},
						});

					if (error) {
						throw new Error(
							error.message || "Failed to fetch session",
						);
					}

					queryClient.setQueryData(sessionQueryKey, () => newSession);
				},
			}}
		>
			{children}
		</SessionContext.Provider>
	);
}

export const useSession = () => {
	const sessionContext = useContext(SessionContext);

	if (sessionContext === undefined) {
		throw new Error("useSession must be used within SessionProvider");
	}

	return sessionContext;
};
