import { orpcClient } from "@shared/lib/orpc-client";

export async function uploadPreviewAsset(
	_api: unknown,
	organizationId: string,
	file: File,
): Promise<{ url: string }> {
	const { signedUploadUrl, url } =
		await orpcClient.previewAssets.createUploadUrl({
			organizationId,
			fileName: file.name,
			contentType: file.type || "application/octet-stream",
		});

	const response = await fetch(signedUploadUrl, {
		method: "PUT",
		body: file,
		headers: {
			"Content-Type": file.type || "application/octet-stream",
		},
	});

	if (!response.ok) {
		throw new Error("Failed to upload preview asset");
	}

	return { url };
}
