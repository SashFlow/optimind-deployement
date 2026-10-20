/** Per-avatar stills that are not `/images/avatar/<id>.png`. */
const AVATAR_PREVIEW_OVERRIDES: Record<string, string> = {
	"mark-arkit": "/avatars/avatar.jpeg",
};

export function getAvatarPreviewUrl(
	externalAvatarId: string | null | undefined,
): string | null {
	if (!externalAvatarId) {
		return null;
	}
	return (
		AVATAR_PREVIEW_OVERRIDES[externalAvatarId] ??
		`/images/avatar/${externalAvatarId}.png`
	);
}
