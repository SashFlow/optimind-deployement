"use client";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { cn } from "@repo/ui/utils";
import * as React from "react";
import { ProviderIcon } from "@/components/saas/agents/configure/ProviderIcon";
import {
	availableDeliveriesForModel,
	findDeliveryVariant,
	formatInferenceHosts,
	formatModelLabel,
	isLivekitInferenceModel,
	type ModelDelivery,
	resolveModelDelivery,
	selectableModels,
} from "@/lib/models";
import type { Provider, ProviderModel } from "@/services/api/types";

type ModelSelectProps = {
	models: ProviderModel[];
	providers?: Provider[];
	providerCredentials?: Set<string>;
	value: string;
	/** Current delivery from the model ref params (drives the BYOK / Inference picker). */
	deliveryMode?: ModelDelivery | string | null;
	onValueChange: (value: string) => void;
	/** Prefer this when flipping delivery for same-id or twin models. */
	onDeliveryChange?: (selection: {
		modelId: string;
		delivery: ModelDelivery;
	}) => void;
	placeholder?: string;
	groupByProvider?: boolean;
	className?: string;
};

export function ModelSelect({
	models,
	providers = [],
	providerCredentials,
	value,
	deliveryMode = null,
	onValueChange,
	onDeliveryChange,
	placeholder = "Select model",
	groupByProvider = true,
	className,
}: ModelSelectProps) {
	const enabledModels = React.useMemo(
		() => models.filter((model) => model.is_enabled),
		[models],
	);

	const listModels = React.useMemo(
		() => selectableModels(enabledModels),
		[enabledModels],
	);

	const providerNames = React.useMemo(() => {
		const map = new Map<string, string>();
		for (const provider of providers) {
			map.set(provider.id, provider.display_name);
		}
		return map;
	}, [providers]);

	const grouped = React.useMemo(() => {
		if (!groupByProvider) {
			return [{ label: null as string | null, models: listModels }];
		}
		const groups = new Map<string, ProviderModel[]>();
		for (const model of listModels) {
			const label = providerNames.get(model.provider_id) ?? "Other";
			const bucket = groups.get(label) ?? [];
			bucket.push(model);
			groups.set(label, bucket);
		}
		return Array.from(groups.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([label, bucket]) => ({
				label,
				models: bucket.sort((left, right) =>
					left.display_name.localeCompare(right.display_name),
				),
			}));
	}, [listModels, groupByProvider, providerNames]);

	const selectedModel =
		enabledModels.find((model) => model.id === value) ??
		listModels.find((model) => model.id === value);

	const activeDelivery = resolveModelDelivery(selectedModel, deliveryMode);
	const deliveryOptions = availableDeliveriesForModel(
		enabledModels,
		selectedModel,
	);
	const showDeliveryPicker = deliveryOptions.length > 1;

	// Select value should be the collapsed list representative when possible.
	const selectValue = React.useMemo(() => {
		if (!selectedModel) {
			return value;
		}
		if (!selectedModel.variant_group) {
			return selectedModel.id;
		}
		const representative = listModels.find(
			(model) => model.variant_group === selectedModel.variant_group,
		);
		return representative?.id ?? selectedModel.id;
	}, [listModels, selectedModel, value]);

	const usesInference = activeDelivery === "livekit_inference";
	const inferenceHosts = formatInferenceHosts(
		usesInference
			? (findDeliveryVariant(
					enabledModels,
					selectedModel,
					"livekit_inference",
				) ?? selectedModel)
			: selectedModel,
	);

	const missingCredential =
		selectedModel &&
		!usesInference &&
		providerCredentials &&
		!providerCredentials.has(selectedModel.provider_id);

	function handleDeliveryChange(delivery: ModelDelivery) {
		if (!selectedModel) {
			return;
		}
		const twin = findDeliveryVariant(
			enabledModels,
			selectedModel,
			delivery,
		);
		const modelId = twin?.id ?? selectedModel.id;
		if (onDeliveryChange) {
			onDeliveryChange({ modelId, delivery });
			return;
		}
		onValueChange(modelId);
	}

	function renderModelItem(model: ProviderModel) {
		const options = availableDeliveriesForModel(enabledModels, model);
		const dual = options.length > 1;
		return (
			<SelectItem key={model.id} value={model.id}>
				<span className="flex min-w-0 items-center gap-2">
					<ProviderIcon providerId={model.provider_id} />
					<span className="truncate">{formatModelLabel(model)}</span>
					{dual ? (
						<span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
							BYOK / Inference
						</span>
					) : isLivekitInferenceModel(model) ? (
						<span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
							Inference
						</span>
					) : null}
				</span>
			</SelectItem>
		);
	}

	return (
		<div className="space-y-2">
			<Select
				value={selectValue}
				onValueChange={(next) => next && onValueChange(next)}
			>
				<SelectTrigger className={className ?? "w-full bg-background"}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{grouped.map((group) =>
						group.label ? (
							<SelectGroup key={group.label}>
								<SelectLabel>{group.label}</SelectLabel>
								{group.models.map(renderModelItem)}
							</SelectGroup>
						) : (
							group.models.map(renderModelItem)
						),
					)}
				</SelectContent>
			</Select>

			{showDeliveryPicker ? (
				<div className="space-y-1.5">
					<p className="text-xs font-medium text-muted-foreground">
						Delivery
					</p>
					<div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1">
						{(
							[
								{
									value: "byok" as const,
									label: "Your API key",
									description: "BYOK",
								},
								{
									value: "livekit_inference" as const,
									label: "LiveKit Inference",
									description: inferenceHosts
										? inferenceHosts
										: "Cloud",
								},
							] as const
						)
							.filter((option) =>
								deliveryOptions.includes(option.value),
							)
							.map((option) => {
								const selected =
									activeDelivery === option.value;
								return (
									<button
										key={option.value}
										type="button"
										onClick={() =>
											handleDeliveryChange(option.value)
										}
										className={cn(
											"rounded-md px-2.5 py-2 text-left transition-colors",
											selected
												? "bg-background shadow-sm"
												: "hover:bg-background/70",
										)}
									>
										<p className="text-xs font-medium leading-tight">
											{option.label}
										</p>
										<p className="mt-0.5 text-[10px] text-muted-foreground">
											{option.description}
										</p>
									</button>
								);
							})}
					</div>
				</div>
			) : null}

			{usesInference && !showDeliveryPicker ? (
				<p className="text-xs text-muted-foreground">
					Routed through LiveKit Inference
					{inferenceHosts ? ` (${inferenceHosts})` : ""}. No provider
					API key required.
				</p>
			) : null}
			{usesInference && showDeliveryPicker ? (
				<p className="text-xs text-muted-foreground">
					LiveKit Inference
					{inferenceHosts ? ` · ${inferenceHosts}` : ""}. No provider
					API key required.
				</p>
			) : null}
			{missingCredential ? (
				<p className="text-xs text-amber-600 dark:text-amber-400">
					This model uses your API key. Add provider credentials in
					organization settings before publishing.
				</p>
			) : null}
		</div>
	);
}
