import { readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const elementsDir = join(root, "src/components/assistant-ui/elements");
const outFile = join(root, "src/components/assistant-ui/index.ts");

const files = readdirSync(elementsDir)
	.filter((f) => /\.(tsx|ts)$/.test(f))
	.sort();

const lines = ["/** Barrel exports for @repo/ui/assistant-ui */", ""];

for (const file of files) {
	const base = file.replace(/\.tsx?$/, "");
	lines.push(`export * from "./elements/${base}";`);
}

lines.push(`export * from "../../hooks/use-attachment-src";`);
lines.push(`export * from "../../hooks/use-copy-to-clipboard";`);
lines.push("");

writeFileSync(outFile, lines.join("\n"));
console.log(`wrote ${files.length} element exports to index.ts`);
