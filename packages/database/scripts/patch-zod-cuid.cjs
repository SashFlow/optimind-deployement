const fs = require("node:fs");
const path = require("node:path");

const zodIndexPath = path.join(__dirname, "../prisma/zod/index.ts");
const source = fs.readFileSync(zodIndexPath, "utf8");

if (!source.includes("generateCuid")) {
	process.exit(0);
}

if (source.includes("@paralleldrive/cuid2")) {
	process.exit(0);
}

const patched = source.replace(
	"import * as z from 'zod';",
	"import { createId as generateCuid } from \"@paralleldrive/cuid2\";\nimport * as z from 'zod';",
);

if (patched === source) {
	console.error("Failed to patch prisma zod cuid import");
	process.exit(1);
}

fs.writeFileSync(zodIndexPath, patched);
console.log("Patched prisma zod generateCuid import");
