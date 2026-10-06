import type { AvatarRef } from "@/lib/agent-config";
import { getAvatarPreviewUrl } from "@/lib/stock-avatars";

/** Matches the provider ids in the avatar catalog (`AVATARS_PROVIDERS`). */
export const PREVIEW_AVATAR_PROVIDERS = [
	"anam",
	"spatialreal",
	"spatius",
] as const;

export type PreviewAvatarProvider = (typeof PREVIEW_AVATAR_PROVIDERS)[number];

/**
 * Everything a session surface needs to render an avatar, resolved once so the
 * preview, the share page and the session controls all agree on it.
 *
 * `anam` publishes an avatar video track into the room; `spatialreal` and
 * `spatius` render a canvas client-side from motion data on that same room.
 */

/** Providers that decode motion client-side (not a conventional video track). */
export function isClientRenderedAvatar(
	provider: PreviewAvatarProvider | string | null | undefined,
): boolean {
	return provider === "spatialreal" || provider === "spatius";
}
export type PreviewAvatar = {
	enabled: boolean;
	provider: PreviewAvatarProvider;
	/** Provider-side avatar id (SpatialReal / Spatius character, or Anam persona). */
	avatarId: string;
	/** Still image shown before the stream starts, and as the anam fallback. */
	previewUrl: string | null;
};

export const DISABLED_PREVIEW_AVATAR: PreviewAvatar = {
	enabled: false,
	provider: "anam",
	avatarId: "",
	previewUrl: null,
};

type AvatarCatalogProvider = {
	id: string;
	avatars: readonly { id: string }[];
};

function isPreviewAvatarProvider(
	value: string | null | undefined,
): value is PreviewAvatarProvider {
	return PREVIEW_AVATAR_PROVIDERS.includes(value as PreviewAvatarProvider);
}

/**
 * Older configs saved an avatar id without a provider id; recover it from the
 * catalog the same way the dispatch metadata does before falling back.
 */
export function resolvePreviewAvatarProvider(
	providerId: string | null | undefined,
	externalAvatarId: string | null | undefined,
	catalog: readonly AvatarCatalogProvider[] = [],
): PreviewAvatarProvider {
	if (isPreviewAvatarProvider(providerId)) {
		return providerId;
	}

	const catalogProviderId = externalAvatarId
		? catalog.find((provider) =>
				provider.avatars.some((item) => item.id === externalAvatarId),
			)?.id
		: null;

	return isPreviewAvatarProvider(catalogProviderId)
		? catalogProviderId
		: "anam";
}

export function resolvePreviewAvatar(
	avatar: AvatarRef | null | undefined,
	catalog: readonly AvatarCatalogProvider[] = [],
): PreviewAvatar {
	if (!avatar?.enabled || !avatar.external_avatar_id) {
		return DISABLED_PREVIEW_AVATAR;
	}

	const avatarId = avatar.external_avatar_id;

	return {
		enabled: true,
		provider: resolvePreviewAvatarProvider(
			avatar.provider_id,
			avatarId,
			catalog,
		),
		avatarId: avatarId,
		previewUrl: getAvatarPreviewUrl(avatarId),
	};
}
