export type StorageObjectRef = {
	bucket?: string;
	container?: string;
	key: string;
};

export type StorageListItem = {
	key: string;
	size?: number;
	lastModified?: string | null;
};

export type ObjectStorageProvider = {
	read(ref: StorageObjectRef): Promise<{ content: string; contentType?: string | null }>;
	write(
		ref: StorageObjectRef,
		content: string,
		contentType?: string,
	): Promise<{ bytes: number }>;
	list(prefix: string, opts?: { maxKeys?: number }): Promise<StorageListItem[]>;
	delete(ref: StorageObjectRef): Promise<void>;
};

export { getSignedUploadUrl, getSignedUrl } from "./s3";
