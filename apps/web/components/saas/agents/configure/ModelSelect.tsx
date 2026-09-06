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
import * as React from "react";
import { formatModelLabel } from "@/lib/models";
import type { Provider, ProviderModel } from "@/services/api/types";

type ModelSelectProps = {
	models: ProviderModel[];
	providers?: Provider[];
	providerCredentials?: Set<string>;
	value: string;
	onValueChange: (value: string) => void;
	placeholder?: string;
	groupByProvider?: boolean;
	className?: string;
};

export function ModelSelect({
	models,
	providers = [],
	providerCredentials,
	value,
	onValueChange,
	placeholder = "Select model",
	groupByProvider = true,
	className,
}: ModelSelectProps) {
	const enabledModels = React.useMemo(
		() => models.filter((model) => model.is_enabled),
		[models],
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
			return [{ label: null as string | null, models: enabledModels }];
		}
		const groups = new Map<string, ProviderModel[]>();
		for (const model of enabledModels) {
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
	}, [enabledModels, groupByProvider, providerNames]);

	const selectedModel = enabledModels.find((model) => model.id === value);
	const missingCredential =
		selectedModel?.delivery_mode === "byok" &&
		providerCredentials &&
		!providerCredentials.has(selectedModel.provider_id);

	return (
		<div className="space-y-2">
			<Select
				value={value}
				onValueChange={(next) => next && onValueChange(next)}
				items={enabledModels.map((model) => ({
					value: model.id,
					label: formatModelLabel(model),
				}))}
			>
				<SelectTrigger className={className ?? "w-full bg-background"}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{grouped.map((group) =>
						group.label ? (
							<SelectGroup key={group.label}>
								<SelectLabel>{group.label}</SelectLabel>
								{group.models.map((model) => (
									<SelectItem key={model.id} value={model.id}>
										{formatModelLabel(model)}
									</SelectItem>
								))}
							</SelectGroup>
						) : (
							group.models.map((model) => (
								<SelectItem key={model.id} value={model.id}>
									{formatModelLabel(model)}
								</SelectItem>
							))
						),
					)}
				</SelectContent>
			</Select>
			{missingCredential ? (
				<p className="text-xs text-amber-600 dark:text-amber-400">
					This model uses your API key. Add provider credentials in
					organization settings before publishing.
				</p>
			) : null}
		</div>
	);
}
