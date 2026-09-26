"use client";

import { Label } from "@repo/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/select";
import { cn } from "@repo/ui/utils";
import { CheckIcon, LockIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { ConfigureSectionToggle } from "@/components/saas/agents/configure/ConfigureSectionToggle";
import type { AgentConfigDocument } from "@/lib/agent-config";
import { AVATAR_MAX_DURATION_SECONDS } from "@/lib/agent-pipeline";
import { useAvatarProvidersQuery } from "@/services/api/hooks";

type AvatarSectionProps = {
	config: AgentConfigDocument;
	organizationId: string;
	onConfigChange: (patch: Partial<AgentConfigDocument>) => void;
};

type AvatarProvider = {
	id: string;
	display_name: string;
	avatars: { id: string; display_name: string }[];
};

type AvatarOption = {
	key: string;
	displayName: string;
	subtitle: string;
	previewUrl: string | null;
	externalAvatarId: string;
	providerId: string;
};

function SectionHeader({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div>
			<h3 className="text-sm font-semibold">{title}</h3>
			<p className="mt-0.5 text-xs text-muted-foreground">
				{description}
			</p>
		</div>
	);
}

function getAvatarKey(providerId: string, avatarId: string): string {
	return `${providerId}:${avatarId}`;
}

function buildAvatarOptions(provider: AvatarProvider | null): AvatarOption[] {
	if (!provider) {
		return [];
	}

	return provider.avatars.map((avatar) => ({
		key: getAvatarKey(provider.id, avatar.id),
		displayName: avatar.display_name,
		subtitle: provider.display_name,
		previewUrl: `/images/avatar/${avatar.id}.png`,
		externalAvatarId: avatar.id,
		providerId: provider.id,
	}));
}

// Older configs may have an avatar id without a provider id; infer it from the catalog.
function getConfiguredProviderId(
	config: AgentConfigDocument,
	providers: AvatarProvider[],
): string | null {
	const avatar = config.avatar;
	if (avatar?.provider_id) {
		return avatar.provider_id;
	}

	if (avatar?.external_avatar_id) {
		const externalAvatarId = avatar.external_avatar_id;
		return (
			providers.find((provider) =>
				provider.avatars.some((item) => item.id === externalAvatarId),
			)?.id ?? null
		);
	}

	return null;
}

function getSelectedAvatarKey(
	config: AgentConfigDocument,
	providerId: string | null,
): string | null {
	const externalAvatarId = config.avatar?.external_avatar_id;
	if (!providerId || !externalAvatarId) {
		return null;
	}

	return getAvatarKey(providerId, externalAvatarId);
}

function AvatarPreviewImage({
	src,
	alt,
	className,
}: {
	src: string | null;
	alt: string;
	className?: string;
}) {
	const [failedSrc, setFailedSrc] = useState<string | null>(null);

	if (!src || failedSrc === src) {
		return (
			<div
				className={cn(
					"flex size-full items-center justify-center bg-muted text-xs text-muted-foreground",
					className,
				)}
			>
				No preview
			</div>
		);
	}

	return (
		// Dynamic avatar URLs; next/image domains vary by provider.
		// eslint-disable-next-line @next/next/no-img-element
		// biome-ignore lint/performance/noImgElement: dynamic avatar URLs
		<img
			src={src}
			alt={alt}
			onError={() => setFailedSrc(src)}
			className={cn("size-full object-cover", className)}
		/>
	);
}

function AvatarSelectCard({
	option,
	selected,
	onSelect,
}: {
	option: AvatarOption;
	selected: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"group relative flex flex-col overflow-hidden rounded-xl border text-left transition-colors",
				selected
					? "border-foreground ring-2 ring-foreground/20"
					: "border-border hover:border-foreground/40",
			)}
		>
			<div className="relative aspect-[3/4] w-full bg-muted">
				<AvatarPreviewImage
					src={option.previewUrl}
					alt={`${option.displayName} avatar preview`}
				/>
				{selected ? (
					<div className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-foreground text-background shadow-sm">
						<CheckIcon className="size-3.5" />
					</div>
				) : null}
			</div>
			<div className="space-y-0.5 px-3 py-2.5">
				<p className="text-sm font-medium">{option.displayName}</p>
				{option.subtitle ? (
					<p className="text-xs text-muted-foreground">
						{option.subtitle}
					</p>
				) : null}
			</div>
		</button>
	);
}

function LockedAddAvatarCard() {
	return (
		<div
			aria-disabled
			className="flex flex-col overflow-hidden rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 opacity-70"
		>
			<div className="relative flex aspect-[3/4] w-full items-center justify-center bg-muted/50">
				<div className="flex size-12 items-center justify-center rounded-full border border-muted-foreground/30 bg-background/60">
					<PlusIcon className="size-6 text-muted-foreground/60" />
				</div>
				<div className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
					<LockIcon className="size-3" />
				</div>
			</div>
			<div className="space-y-0.5 px-3 py-2.5">
				<p className="text-sm font-medium text-muted-foreground">
					Add custom avatar
				</p>
				<p className="text-xs text-muted-foreground">
					Upgrade to unlock
				</p>
			</div>
		</div>
	);
}

export function AvatarSection({
	config,
	organizationId,
	onConfigChange,
}: AvatarSectionProps) {
	const providersQuery = useAvatarProvidersQuery();
	const providers = providersQuery.data ?? [];
	const configuredProviderId = getConfiguredProviderId(config, providers);
	const selectedKey = getSelectedAvatarKey(config, configuredProviderId);

	// Browsing a provider doesn't change the saved avatar until one is picked.
	const [browsingProviderId, setBrowsingProviderId] = useState<string | null>(
		null,
	);
	const activeProvider =
		providers.find(
			(provider) =>
				provider.id === (browsingProviderId ?? configuredProviderId),
		) ??
		providers[0] ??
		null;
	const avatarOptions = buildAvatarOptions(activeProvider);

	const selectedProvider =
		providers.find((provider) => provider.id === configuredProviderId) ??
		null;
	const selectedOption =
		buildAvatarOptions(selectedProvider).find(
			(option) => option.key === selectedKey,
		) ?? null;

	function selectAvatar(option: AvatarOption) {
		onConfigChange({
			avatar: {
				...(config.avatar ?? { params: {} }),
				enabled: true,
				org_avatar_id: null,
				provider_id: option.providerId,
				external_avatar_id: option.externalAvatarId,
			},
			call_ending: {
				...config.call_ending,
				max_duration_seconds: AVATAR_MAX_DURATION_SECONDS,
			},
		});
	}

	return (
		<div className="rounded-xl border bg-card divide-y">
			<div className="space-y-4 px-4 py-4 md:px-5">
				<SectionHeader
					title="Session avatar"
					description="Choose a visual avatar for web sessions. Avatars are not shown on phone calls."
				/>
			</div>

			<div className="px-4 py-4 md:px-5">
				<ConfigureSectionToggle
					title="Enable avatar"
					description="Show a live avatar video stream alongside the assistant voice in web sessions. Maximum call duration is set to 5 minutes while avatar is enabled."
					checked={config.avatar?.enabled ?? false}
					onCheckedChange={(enabled) =>
						onConfigChange({
							avatar: {
								...(config.avatar ?? { params: {} }),
								enabled,
							},
							...(enabled
								? {
										call_ending: {
											...config.call_ending,
											max_duration_seconds:
												AVATAR_MAX_DURATION_SECONDS,
										},
									}
								: {}),
						})
					}
				>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="avatar-provider">Provider</Label>
							<Select
								value={activeProvider?.id ?? ""}
								onValueChange={(value) =>
									value && setBrowsingProviderId(value)
								}
								disabled={providers.length === 0}
							>
								<SelectTrigger
									id="avatar-provider"
									className="w-full bg-background sm:max-w-xs"
								>
									<SelectValue
										placeholder={
											providersQuery.isLoading
												? "Loading providers..."
												: "Select a provider"
										}
									/>
								</SelectTrigger>
								<SelectContent>
									{providers.map((provider) => (
										<SelectItem
											key={provider.id}
											value={provider.id}
										>
											{provider.display_name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{avatarOptions.map((option) => (
								<AvatarSelectCard
									key={option.key}
									option={option}
									selected={selectedKey === option.key}
									onSelect={() => selectAvatar(option)}
								/>
							))}
							<LockedAddAvatarCard />
						</div>

						{selectedOption ? (
							<div className="rounded-lg border bg-background/60 p-4">
								<p className="mb-3 text-xs font-medium text-muted-foreground">
									Selected preview
								</p>
								<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
									<div className="relative aspect-[3/4] w-full max-w-[180px] overflow-hidden rounded-lg border bg-muted">
										<AvatarPreviewImage
											src={selectedOption.previewUrl}
											alt={`${selectedOption.displayName} selected avatar preview`}
										/>
									</div>
									<div className="min-w-0 space-y-1">
										<p className="text-sm font-semibold">
											{selectedOption.displayName}
										</p>
										{selectedOption.subtitle ? (
											<p className="text-xs text-muted-foreground">
												{selectedOption.subtitle}
											</p>
										) : null}
										<p className="pt-2 text-xs text-muted-foreground">
											This avatar will appear in web
											preview and live sessions when
											avatar mode is enabled.
										</p>
									</div>
								</div>
							</div>
						) : (
							<p className="text-sm text-muted-foreground">
								Select an avatar above to preview it for this
								agent.
							</p>
						)}
					</div>
				</ConfigureSectionToggle>
			</div>
		</div>
	);
}
