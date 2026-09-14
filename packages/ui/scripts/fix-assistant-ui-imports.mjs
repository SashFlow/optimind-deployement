import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcRoot = join(pkgRoot, "src");

function walk(dir, out = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(p, out);
		} else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
			out.push(p);
		}
	}
	return out;
}

function toPosix(p) {
	return p.split("\\").join("/");
}

function relImport(fromFile, absTarget) {
	let rel = toPosix(relative(dirname(fromFile), absTarget));
	if (!rel.startsWith(".")) {
		rel = `./${rel}`;
	}
	return rel.replace(/\.tsx?$/, "");
}

const aliasMap = [
	[/@\/components\/ui\/([^"']+)/, (m) => join(srcRoot, "shadcn", m)],
	[
		/@\/components\/assistant-ui\/([^"']+)/,
		(m) => join(srcRoot, "components/assistant-ui", m),
	],
	[
		/@\/components\/icons\/([^"']+)/,
		(m) => join(srcRoot, "components/icons", m),
	],
	[/@\/hooks\/([^"']+)/, (m) => join(srcRoot, "hooks", m)],
	[/@\/lib\/utils/, () => join(srcRoot, "utils")],
	[/src\/shadcn\/([^"']+)/, (m) => join(srcRoot, "shadcn", m)],
	[
		/src\/components\/assistant-ui\/([^"']+)/,
		(m) => join(srcRoot, "components/assistant-ui", m),
	],
	[
		/src\/components\/icons\/([^"']+)/,
		(m) => join(srcRoot, "components/icons", m),
	],
	[/src\/hooks\/([^"']+)/, (m) => join(srcRoot, "hooks", m)],
	[/src\/utils/, () => join(srcRoot, "utils")],
];

const targets = [
	join(srcRoot, "components/assistant-ui"),
	join(srcRoot, "hooks/use-attachment-src.ts"),
	join(srcRoot, "hooks/use-copy-to-clipboard.ts"),
	join(srcRoot, "components/icons"),
	join(srcRoot, "shadcn/diff-viewer.tsx"),
	join(srcRoot, "shadcn/direction.tsx"),
	join(srcRoot, "shadcn/dot-matrix.tsx"),
	join(srcRoot, "shadcn/number-roll.tsx"),
	join(srcRoot, "shadcn/resizable.tsx"),
];

const files = [];
for (const target of targets) {
	if (!existsSync(target)) {
		continue;
	}
	if (statSync(target).isFile()) {
		files.push(target);
	} else {
		files.push(...walk(target));
	}
}

let changed = 0;
for (const file of files) {
	const original = readFileSync(file, "utf8");
	let next = original;

	next = next.replace(/from\s+["']([^"']+)["']/g, (full, spec) => {
		for (const [re, toAbs] of aliasMap) {
			const match = spec.match(re);
			if (!match) {
				continue;
			}
			const abs = toAbs(match[1] ?? "");
			const rel = relImport(file, abs);
			return `from "${rel}"`;
		}
		return full;
	});

	if (next !== original) {
		writeFileSync(file, next);
		changed += 1;
	}
}

console.log(`rewrote ${changed} of ${files.length} files to relative imports`);
