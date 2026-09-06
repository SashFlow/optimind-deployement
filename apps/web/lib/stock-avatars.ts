export type StockAvatar = {
	id: string;
	displayName: string;
	previewUrl: string | null;
};

export const STOCK_AVATARS: StockAvatar[] = [
	{
		id: "5f46f99e-c4be-4f22-bde2-b364975a0851",
		displayName: "Sanjay",
		previewUrl: "/images/avatar/5f46f99e-c4be-4f22-bde2-b364975a0851.png",
	},
	{
		id: "d3e94c42-b348-4bec-8225-e47a682128a0",
		displayName: "Samira",
		previewUrl: "/images/avatar/d3e94c42-b348-4bec-8225-e47a682128a0.png",
	},
];

export function getAvatarPreviewUrl(
	externalAvatarId: string | null | undefined,
): string | null {
	if (!externalAvatarId) return null;
	return (
		STOCK_AVATARS.find((avatar) => avatar.id === externalAvatarId)
			?.previewUrl ?? null
	);
}
