export function getAvatarPreviewUrl(
	externalAvatarId: string | null | undefined,
): string | null {
	if (!externalAvatarId) {
		return null;
	}
	return `/images/avatar/${externalAvatarId}.png`;
}
