"use client";

import { createContext, useContext } from "react";
import type { UseSpatiusAvatarResult } from "@/types/spatius-avatar";

export const SpatiusAvatarContext =
	createContext<UseSpatiusAvatarResult | null>(null);

export function useSpatiusAvatarContext(): UseSpatiusAvatarResult {
	const value = useContext(SpatiusAvatarContext);
	if (!value) {
		throw new Error(
			"useSpatiusAvatarContext must be used within SpatiusAvatarProvider",
		);
	}
	return value;
}
