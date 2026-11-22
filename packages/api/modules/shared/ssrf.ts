import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const BLOCKED_HOSTNAMES = new Set([
	"localhost",
	"metadata.google.internal",
	"metadata.google",
]);

function ipv4ToInt(ip: string): number {
	const parts = ip.split(".").map((p) => Number(p));
	if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
		return -1;
	}
	return (
		((parts[0]! << 24) >>> 0) +
		((parts[1]! << 16) >>> 0) +
		((parts[2]! << 8) >>> 0) +
		(parts[3]! >>> 0)
	);
}

function isPrivateOrReservedIpv4(ip: string): boolean {
	const n = ipv4ToInt(ip);
	if (n < 0) {
		return true;
	}
	// 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16,
	// 172.16.0.0/12, 192.168.0.0/16, 224.0.0.0/4, 240.0.0.0/4
	return (
		(n & 0xff000000) === 0x00000000 ||
		(n & 0xff000000) === 0x0a000000 ||
		(n & 0xff000000) === 0x7f000000 ||
		(n & 0xffff0000) === 0xa9fe0000 ||
		(n & 0xfff00000) === 0xac100000 ||
		(n & 0xffff0000) === 0xc0a80000 ||
		(n & 0xf0000000) === 0xe0000000 ||
		(n & 0xf0000000) === 0xf0000000
	);
}

function isPrivateOrReservedIpv6(ip: string): boolean {
	const normalized = ip.toLowerCase();
	return (
		normalized === "::1" ||
		normalized === "::" ||
		normalized.startsWith("fc") ||
		normalized.startsWith("fd") ||
		normalized.startsWith("fe80") ||
		normalized.startsWith("::ffff:") // IPv4-mapped — check embedded
	);
}

function isBlockedIp(ip: string): boolean {
	const version = isIP(ip);
	if (version === 4) {
		return isPrivateOrReservedIpv4(ip);
	}
	if (version === 6) {
		if (ip.toLowerCase().startsWith("::ffff:")) {
			const mapped = ip.slice(7);
			if (isIP(mapped) === 4) {
				return isPrivateOrReservedIpv4(mapped);
			}
		}
		return isPrivateOrReservedIpv6(ip);
	}
	return true;
}

export async function assertSafeExternalUrl(
	rawUrl: string,
	opts?: { maxRedirects?: number },
): Promise<URL> {
	let current = rawUrl;
	const maxRedirects = opts?.maxRedirects ?? 3;

	for (let i = 0; i <= maxRedirects; i++) {
		let url: URL;
		try {
			url = new URL(current);
		} catch {
			throw new Error("Invalid URL");
		}

		if (url.protocol !== "https:" && url.protocol !== "http:") {
			throw new Error("Only http(s) URLs are allowed");
		}
		if (url.protocol !== "https:") {
			throw new Error("Only https URLs are allowed");
		}
		if (url.username || url.password) {
			throw new Error("URLs with credentials are not allowed");
		}
		if (url.port && url.port !== "443" && url.port !== "") {
			throw new Error("Non-standard ports are not allowed");
		}

		const hostname = url.hostname.toLowerCase();
		if (
			BLOCKED_HOSTNAMES.has(hostname) ||
			hostname.endsWith(".local") ||
			hostname.endsWith(".internal")
		) {
			throw new Error("Hostname is not allowed");
		}

		if (isIP(hostname)) {
			if (isBlockedIp(hostname)) {
				throw new Error("IP address is not allowed");
			}
		} else {
			const records = await lookup(hostname, { all: true });
			if (!records.length) {
				throw new Error("Hostname could not be resolved");
			}
			for (const record of records) {
				if (isBlockedIp(record.address)) {
					throw new Error("Resolved IP address is not allowed");
				}
			}
		}

		if (i === maxRedirects) {
			return url;
		}

		const head = await fetch(url.toString(), {
			method: "HEAD",
			redirect: "manual",
			headers: { "User-Agent": "OptimindKnowledgeBot/1.0" },
		}).catch(() => null);

		if (!head) {
			return url;
		}

		const status = head.status;
		if (status >= 300 && status < 400) {
			const location = head.headers.get("location");
			if (!location) {
				return url;
			}
			current = new URL(location, url).toString();
			continue;
		}

		return url;
	}

	throw new Error("Too many redirects");
}

export async function fetchSafeExternalUrl(
	rawUrl: string,
	opts?: { maxBytes?: number },
): Promise<Response> {
	const safe = await assertSafeExternalUrl(rawUrl);
	const response = await fetch(safe.toString(), {
		headers: { "User-Agent": "OptimindKnowledgeBot/1.0" },
		redirect: "error",
	});

	const maxBytes = opts?.maxBytes ?? 10 * 1024 * 1024;
	const length = Number(response.headers.get("content-length") ?? "0");
	if (length > maxBytes) {
		throw new Error("Remote content exceeds size limit");
	}

	return response;
}
