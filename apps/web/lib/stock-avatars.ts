/** Catalog / legacy ids for client-rendered 3DGS (arkit) assets. */
const GSPLAT_ASSET_BY_ID: Record<string, { zip: string; preview: string }> = {
	avatar: {
		zip: "/gsplat/avatar.zip",
		preview: "/images/gsplat/avatar.png",
	},
	"avatar-maledoc": {
		zip: "/gsplat/avatar-maledoc.zip",
		preview: "/images/gsplat/avatar-maledoc.png",
	},
	"avatar-femaledoc": {
		zip: "/gsplat/avatar-femaledoc.zip",
		preview: "/images/gsplat/avatar-femaledoc.png",
	},
	// Older configs saved this id before the multi-avatar catalog.
	"gsplat-default": {
		zip: "/gsplat/avatar.zip",
		preview: "/images/gsplat/avatar.png",
	},
};

export function getGsplatAvatarZipUrl(
	externalAvatarId: string | null | undefined,
): string {
	if (!externalAvatarId) {
		return GSPLAT_ASSET_BY_ID.avatar.zip;
	}
	return (
		GSPLAT_ASSET_BY_ID[externalAvatarId]?.zip ??
		`/gsplat/${externalAvatarId}.zip`
	);
}

export function getAvatarPreviewUrl(
	externalAvatarId: string | null | undefined,
	providerId?: string | null,
): string | null {
	if (!externalAvatarId) {
		return null;
	}

	const gsplat = GSPLAT_ASSET_BY_ID[externalAvatarId];
	if (providerId === "arkit" || gsplat) {
		return gsplat?.preview ?? `/images/gsplat/${externalAvatarId}.png`;
	}

	return `/images/avatar/${externalAvatarId}.png`;
}
