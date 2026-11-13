import type { ProviderModel } from "@/services/api/types";

export type ModelDelivery = "byok" | "livekit_inference";

export function isLivekitInferenceModel(
	model: ProviderModel | undefined | null,
): boolean {
	return model?.delivery === "livekit_inference";
}

export function formatInferenceHosts(
	model: ProviderModel | undefined | null,
): string | null {
	const hosts = model?.inference_providers?.filter(Boolean) ?? [];
	if (hosts.length === 0) {
		return null;
	}
	return hosts.join(", ");
}

export function formatModelLabel(model: ProviderModel): string {
	return model.display_name || model.id;
}

export function resolveModelDelivery(
	model: ProviderModel | undefined | null,
	paramsDelivery: unknown,
): ModelDelivery {
	if (paramsDelivery === "livekit_inference" || paramsDelivery === "byok") {
		return paramsDelivery;
	}
	if (model?.delivery === "livekit_inference") {
		return "livekit_inference";
	}
	return "byok";
}

/** All catalog rows that share a variant group (or the model alone). */
export function deliveryVariants(
	models: ProviderModel[],
	model: ProviderModel | undefined | null,
): ProviderModel[] {
	if (!model) {
		return [];
	}
	if (model.variant_group) {
		return models.filter(
			(item) =>
				item.is_enabled && item.variant_group === model.variant_group,
		);
	}
	if ((model.available_deliveries?.length ?? 0) > 1) {
		return [model];
	}
	return [model];
}

/** Deliveries the user can pick for this model / variant group. */
export function availableDeliveriesForModel(
	models: ProviderModel[],
	model: ProviderModel | undefined | null,
): ModelDelivery[] {
	if (!model) {
		return [];
	}
	if ((model.available_deliveries?.length ?? 0) > 1) {
		return model.available_deliveries as ModelDelivery[];
	}
	const variants = deliveryVariants(models, model);
	const deliveries = new Set<ModelDelivery>();
	for (const variant of variants) {
		deliveries.add(
			variant.delivery === "livekit_inference"
				? "livekit_inference"
				: "byok",
		);
	}
	return Array.from(deliveries);
}

export function findDeliveryVariant(
	models: ProviderModel[],
	model: ProviderModel | undefined | null,
	delivery: ModelDelivery,
): ProviderModel | undefined {
	if (!model) {
		return undefined;
	}
	// Same-id dual delivery: keep this catalog row.
	if ((model.available_deliveries?.length ?? 0) > 1) {
		return model.available_deliveries?.includes(delivery)
			? model
			: undefined;
	}
	const variants = deliveryVariants(models, model);
	return variants.find((variant) =>
		delivery === "livekit_inference"
			? variant.delivery === "livekit_inference"
			: variant.delivery !== "livekit_inference",
	);
}

/**
 * Collapse BYOK/Inference twins to one row in the dropdown.
 * Prefer the BYOK row; if only inference exists, keep that.
 */
export function selectableModels(models: ProviderModel[]): ProviderModel[] {
	const enabled = models.filter((model) => model.is_enabled);
	const seenGroups = new Set<string>();
	const result: ProviderModel[] = [];

	for (const model of enabled) {
		const group = model.variant_group;
		if (!group) {
			result.push(model);
			continue;
		}
		if (seenGroups.has(group)) {
			continue;
		}
		seenGroups.add(group);
		const variants = enabled.filter((item) => item.variant_group === group);
		const byok = variants.find(
			(item) => item.delivery !== "livekit_inference",
		);
		result.push(byok ?? variants[0]!);
	}

	return result;
}
