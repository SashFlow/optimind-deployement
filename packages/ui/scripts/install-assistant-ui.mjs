/**
 * Installs @assistant-ui registry components into packages/ui via shadcn CLI.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const registryPath = process.argv[2];
if (!registryPath) {
	console.error("Usage: node install-assistant-ui.mjs <registry.json path>");
	process.exit(1);
}

const EXCLUDE = new Set([
	"utils",
	"assistant-ui",
	"ai-sdk-backend",
	"ai-sdk-backend-resumable",
	"chat/b/ai-sdk-quick-start/json",
	"eve-chat",
	"accordion",
	"badge",
	"select",
	"tabs",
]);

const registry = JSON.parse(readFileSync(registryPath, "utf8"));
const names = registry.items
	.map((item) => item.name)
	.filter((name) => !EXCLUDE.has(name));

console.log(`Installing ${names.length} @assistant-ui components...`);

const BATCH = 10;
const cwd = join(__dirname, "..");

for (let i = 0; i < names.length; i += BATCH) {
	const batch = names.slice(i, i + BATCH);
	const args = batch.map((n) => `@assistant-ui/${n}`).join(" ");
	console.log(
		`\n[${i + 1}-${i + batch.length}/${names.length}] ${batch.join(", ")}`,
	);
	try {
		execSync(`pnpm dlx shadcn@latest add ${args} --yes --overwrite`, {
			cwd,
			stdio: "inherit",
			env: process.env,
			shell: true,
		});
	} catch (err) {
		console.error("Batch failed, continuing:", err?.message ?? err);
	}
}

console.log("\nDone.");
