import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import yaml from "js-yaml";

const root = path.dirname(fileURLToPath(import.meta.url));

// Released packages only. The repo is public: an unreleased name must never enter git.
// Grow this list only on release day (see AGENTS.md rule 8).
const RELEASED = [
  "olsrr",
  "blorr",
  "xplorerr",
  "descriptr",
  "inferr",
  "vistributions",
  "rbin",
  "rfm",
  "yahoofinancer",
  "standby",
  "nse2r",
];

const TRACKS = ["flagship", "utility", "archived"];
const CATEGORIES = ["regression", "statistics", "wrangling", "utilities", "archived"];
const STATUSES = ["active", "maintenance", "pending-cran", "deprecated", "archived"];

export function loadCatalog() {
  const raw = readFileSync(path.join(root, "data/packages.yaml"), "utf8");
  const pkgs = yaml.load(raw);
  if (!Array.isArray(pkgs) || pkgs.length === 0) {
    throw new Error("data/packages.yaml must be a non-empty YAML sequence");
  }
  return pkgs;
}

export function githubUrl(p) {
  return p.github ?? `https://github.com/rsquaredacademy/${p.name}`;
}

export function docsUrl(p) {
  return p.docs ?? `https://${p.name}.rsquaredacademy.com`;
}

export function cranUrl(p) {
  return `https://cran.r-project.org/package=${p.name}`;
}

export function hexPath(p) {
  return p.hex ?? `images/hex-${p.name}.webp`;
}

export function validate(pkgs) {
  const errors = [];
  const warnings = [];
  const seen = new Set();

  for (const [i, p] of pkgs.entries()) {
    const at = `packages[${i}] (${p?.name ?? "unnamed"})`;
    const err = (msg) => errors.push(`${at}: ${msg}`);

    if (!p.name || typeof p.name !== "string") {
      err("missing name");
      continue;
    }
    if (seen.has(p.name)) err(`duplicate name "${p.name}"`);
    seen.add(p.name);

    if (!RELEASED.includes(p.name)) {
      err(
        `"${p.name}" is not in the released-name allowlist - ` +
          `unreleased packages must never be committed (public repo embargo)`,
      );
    }

    if (!p.tagline || typeof p.tagline !== "string" || !p.tagline.trim()) {
      err("tagline is required");
    }
    if (!TRACKS.includes(p.track)) err(`track must be one of ${TRACKS.join(", ")}`);
    if (!CATEGORIES.includes(p.category)) {
      err(`category must be one of ${CATEGORIES.join(", ")}`);
    }
    if (!STATUSES.includes(p.status ?? "active")) {
      err(`status must be one of ${STATUSES.join(", ")}`);
    }
    if (p.cran !== undefined && typeof p.cran !== "boolean") err("cran must be a boolean");
    if (p.features !== undefined && !Array.isArray(p.features)) {
      err("features must be a list");
    }
    for (const field of ["github", "docs", "hex"]) {
      if (p[field] !== undefined && !/^(https?:\/\/|images\/)/.test(p[field])) {
        err(`${field} must be an absolute URL or images/ path`);
      }
    }

    if (p.track === "flagship" && !(p.features ?? []).length) {
      err("flagship packages need a features list");
    }
    if (p.track === "flagship" && !existsSync(path.join(root, hexPath(p)))) {
      // WebP conversion lands in Phase 3; until then this is a warning, not a failure.
      warnings.push(`${at}: hex asset missing: ${hexPath(p)}`);
    }
    if (p.track === "archived") {
      if (!p.archived) err("archived track requires an archived date");
      if (p.category !== "archived") err("archived track belongs in the archived category");
      if (p.docs) err("archived packages must not link docs (dead docs sites)");
    }
    if ((p.status ?? "active") === "archived" && p.track !== "archived") {
      err("status archived requires track archived");
    }
  }

  return { errors, warnings };
}

function summary(pkgs) {
  const lines = pkgs.map((p) => {
    const hex = p.track === "flagship" ? hexPath(p) : "(no hex)";
    const feat = (p.features ?? []).length;
    return `  ${p.name.padEnd(15)} ${p.track.padEnd(9)} ${p.category.padEnd(10)} ${String(feat).padStart(2)} features  ${hex}`;
  });
  return [`catalog: ${pkgs.length} packages`, ...lines].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const pkgs = await loadCatalog();
    const { errors, warnings } = validate(pkgs);
    for (const w of warnings) console.warn(`warning: ${w}`);
    if (errors.length) {
      console.error(`catalog validation failed (${errors.length}):`);
      for (const e of errors) console.error(`  - ${e}`);
      process.exit(1);
    }
    console.log(summary(pkgs));
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
  }
}
