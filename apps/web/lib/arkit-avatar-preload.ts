/**
 * Prefetch the 3DGS avatar ZIP during the prejoin lobby so Join does not wait
 * on a multi‑MB download. The splat renderer then hits the browser HTTP cache.
 */

const cache = new Map<string, Promise<ArrayBuffer>>();

export function preloadArkitZip(url: string): Promise<ArrayBuffer> {
	let pending = cache.get(url);
	if (!pending) {
		pending = fetch(url)
			.then(async (response) => {
				if (!response.ok) {
					throw new Error(
						`Failed to fetch ARKit avatar ZIP (${response.status}): ${url}`,
					);
				}
				return response.arrayBuffer();
			})
			.catch((err) => {
				cache.delete(url);
				throw err;
			});
		cache.set(url, pending);
	}
	return pending;
}

/** In-flight or completed preload for `url`, if any. */
export function getArkitZipPreload(
	url: string,
): Promise<ArrayBuffer> | undefined {
	return cache.get(url);
}
