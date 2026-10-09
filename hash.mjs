// Prints the CSP hash for the inlined theme-init script (js/theme-init.js).
// Paste the result into the script-src directive of _headers whenever the
// theme-init script changes.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(root, "js/theme-init.js"), "utf8");
const hash = createHash("sha256").update(src, "utf8").digest("base64");
console.log(`'sha256-${hash}'`);
