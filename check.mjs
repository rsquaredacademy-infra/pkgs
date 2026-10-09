// Link validation for the generated portal: every external URL in index.html
// must answer with a non-error status. Run after `npm run build`.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadCatalog, validate } from "./build.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));

// LinkedIn answers bots with HTTP 999 ("request blocked"); the URL itself is valid.
const BOT_BLOCK_HOSTS = ["www.linkedin.com"];

async function checkUrl(url) {
  let last = "no response";
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: AbortSignal.timeout(20000),
        headers: { "user-agent": "pkgs.rsquaredacademy.com link-checker" },
      });
      if (res.status < 400) return { url, ok: true, status: res.status };
      last = `HTTP ${res.status}`;
      const host = new URL(url).hostname;
      if (res.status === 999 && BOT_BLOCK_HOSTS.includes(host)) {
        return { url, ok: true, status: "999 (bot-blocked, treated as ok)" };
      }
    } catch (e) {
      last = e.name === "TimeoutError" ? "timeout" : e.message;
    }
  }
  return { url, ok: false, detail: last };
}

const html = readFileSync(path.join(root, "index.html"), "utf8");
const urls = [
  ...new Set(
    [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]).sort(),
  ),
];

const pkgs = loadCatalog();
const { errors } = validate(pkgs);
if (errors.length) {
  console.error(`catalog validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`checking ${urls.length} links from index.html...`);
const results = await Promise.all(urls.map(checkUrl));
const failed = results.filter((r) => !r.ok);

for (const r of results) {
  console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.status ?? r.detail}  ${r.url}`);
}

if (failed.length) {
  console.error(`\n${failed.length} broken link(s)`);
  process.exit(1);
}
console.log(`\nall ${results.length} links ok`);
