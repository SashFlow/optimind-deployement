import type { ActiveOrganization } from "@repo/auth";
import React, { useContext } from "react";

export const ActiveOrganizationContext = React.createContext<
	| {
			activeOrganization: ActiveOrganization | null;
			activeOrganizationUserRole:
				| ActiveOrganization["members"][number]["role"]
				| null;
			isOrganizationAdmin: boolean;
			loaded: boolean;
			setActiveOrganization: (
				organizationId: string | null,
			) => Promise<void>;
			refetchActiveOrganization: () => Promise<void>;
	  }
	| undefined
>(undefined);

export const useActiveOrganization = () => {
	const activeOrganizationContext = useContext(ActiveOrganizationContext);

	type ActiveOrganizationContextType = NonNullable<
		typeof activeOrganizationContext
	>;

	if (activeOrganizationContext === undefined) {
		return {
			activeOrganization: null,
			setActiveOrganization: () => Promise.resolve(),
			refetchActiveOrganization: () => Promise.resolve(),
			activeOrganizationUserRole: null,
			isOrganizationAdmin: false,
			loaded: true,
		} satisfies ActiveOrganizationContextType;
	}

	return activeOrganizationContext;
};
