import type { SpatialRealWarmupCredentials } from "@repo/api/modules/sessions/public-types";
import { orpcClient } from "@shared/lib/orpc-client";

export async function fetchConfigureSpatialRealWarmup(input: {
	organizationId: string;
	agentId: string;
}): Promise<SpatialRealWarmupCredentials> {
	return orpcClient.sessions.warmSpatialRealCredentials(input);
}

export async function fetchTrialSpatialRealWarmup(input: {
	token: string;
}): Promise<SpatialRealWarmupCredentials> {
	return orpcClient.sessions.warmTrialSpatialRealCredentials(input);
}

export async function fetchEmbedSpatialRealWarmup(input: {
	token: string;
}): Promise<SpatialRealWarmupCredentials> {
	return orpcClient.sessions.warmEmbedSpatialRealCredentials(input);
}
