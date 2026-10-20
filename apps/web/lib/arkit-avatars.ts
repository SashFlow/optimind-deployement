/**
 * Client-side map of ARKit catalog avatar ids → static 3DGS ZIP URLs.
 * Keep in sync with `ARKIT_AVATAR_ZIP_URLS` in `@repo/api` catalog data.
 */
export const ARKIT_AVATAR_ZIP_URLS: Record<string, string> = {
	"mark-arkit": "/avatars/avatar.zip",
};

export function getArkitZipUrl(
	externalAvatarId: string | null | undefined,
): string | null {
	if (!externalAvatarId) {
		return null;
	}
	return ARKIT_AVATAR_ZIP_URLS[externalAvatarId] ?? null;
}
