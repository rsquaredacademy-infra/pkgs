import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
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

const SECTIONS = [
  { id: "regression", title: "Regression and modelling" },
  { id: "statistics", title: "Descriptive and inferential statistics" },
  { id: "wrangling", title: "Data wrangling and segmentation" },
  { id: "utilities", title: "Utilities" },
  { id: "archived", title: "Archived" },
];

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

/* ---------- asset cache-busting ---------- */

// /images, /css and /js are served with long-lived cache headers, so any
// change to a file needs a new URL. Each local asset gets a short content
// hash as a query parameter: edits invalidate immediately, no manual bumps.
const assetHashes = new Map();

export function versionedUrl(relPath) {
  if (!assetHashes.has(relPath)) {
    let hash = "";
    try {
      const buf = readFileSync(path.join(root, relPath));
      hash = createHash("sha256").update(buf).digest("hex").slice(0, 10);
    } catch {
      hash = ""; // missing asset: leave the path alone so the 404 is visible
    }
    assetHashes.set(relPath, hash);
  }
  const hash = assetHashes.get(relPath);
  return hash ? `${relPath}?v=${hash}` : relPath;
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

/* ---------- rendering ---------- */

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// backticks in YAML become inline <code> (e.g. "a fitted `lm`")
const inlineCode = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");

let hexDimsCache = null;
function hexDims(name) {
  if (hexDimsCache === null) {
    try {
      hexDimsCache = JSON.parse(readFileSync(path.join(root, "data/hex.json"), "utf8"));
    } catch {
      hexDimsCache = {};
    }
  }
  return hexDimsCache[name] ?? null;
}

function actions(p) {
  const links = [];
  if (p.cran !== false) {
    links.push({
      href: cranUrl(p),
      label: p.track === "archived" ? "CRAN (archived)" : "CRAN",
    });
  }
  links.push({ href: githubUrl(p), label: "GitHub", primary: p.track === "archived" });
  if (p.track !== "archived") {
    links.push({ href: docsUrl(p), label: "Docs" });
  }
  const buttons = links
    .map(
      (l) =>
        `<a class="lbtn${l.primary ? " primary" : ""}" href="${esc(l.href)}">${esc(l.label)}</a>`,
    )
    .join("");
  return `<div class="lactions"><div class="lactions-row">${buttons}</div></div>`;
}

function metaLine(p) {
  if (p.status === "maintenance") {
    return '<p class="lmeta"><span class="lpill">Maintenance mode</span> bug fixes only</p>';
  }
  if (p.track === "archived") {
    const revival = p.revival ? ` ${esc(p.revival)}` : "";
    return `<p class="lmeta"><span class="lpill arch">Archived ${esc(p.archived)}</span>${revival}</p>`;
  }
  return "";
}

function blurbBox(p) {
  return p.blurb ? `<p class="lprereq">${inlineCode(p.blurb)}</p>` : "";
}

function detailsBox(p) {
  if (!(p.features ?? []).length) return "";
  const items = p.features.map((f) => `<li>${esc(f)}</li>`).join("");
  return `<details><summary>What's inside</summary><ul>${items}</ul></details>`;
}

function card(p) {
  if (p.track === "flagship") {
    const dims = hexDims(p.name);
    const size = dims ? ` width="${dims.width}" height="${dims.height}"` : "";
    return `<article class="lcard lcard-h" id="${p.name}">
  <div class="lside">
    <img class="lcover lcover-hex" src="${esc(versionedUrl(hexPath(p)))}" alt="${esc(p.name)} hex sticker"${size} loading="lazy" decoding="async">
    ${actions(p)}
  </div>
  <div class="lbody">
    <p class="ltrack">Flagship</p>
    <h3><a href="${esc(docsUrl(p))}">${esc(p.name)}</a></h3>
    <p class="lout">${esc(p.tagline)}</p>
    ${metaLine(p)}
    ${blurbBox(p)}
    ${detailsBox(p)}
  </div>
</article>`;
  }

  if (p.track === "archived") {
    const nameLink = `<h3><a href="${esc(githubUrl(p))}">${esc(p.name)}</a></h3>`;
    return `<article class="lcard" id="${p.name}">
  <div class="lbody">
    <p class="ltrack arch">Archived</p>
    ${nameLink}
    <p class="lout">${esc(p.tagline)}</p>
    ${metaLine(p)}
    ${blurbBox(p)}
    ${actions(p)}
  </div>
</article>`;
  }

  return `<article class="lcard" id="${p.name}">
  <div class="lbody">
    <p class="ltrack util">Utility</p>
    <h3><a href="${esc(docsUrl(p))}">${esc(p.name)}</a></h3>
    <p class="lout">${esc(p.tagline)}</p>
    ${metaLine(p)}
    ${actions(p)}
  </div>
</article>`;
}

export function renderSections(pkgs) {
  return SECTIONS.map((sec) => {
    const items = pkgs.filter((p) => p.category === sec.id);
    if (!items.length) return "";
    const grid = items.some((p) => p.track === "flagship") ? "lgrid lgrid-h" : "lgrid";
    return `<section id="${sec.id}">
  <h2>${sec.title}</h2>
  <div class="${grid}">
${items.map((p) => card(p)).join("\n")}
  </div>
</section>`;
  })
    .filter(Boolean)
    .join("\n");
}

function jsonLd(pkgs) {
  const graph = pkgs
    .filter((p) => p.track !== "archived")
    .map((p) => ({
      "@type": "SoftwareSourceCode",
      name: p.name,
      description: p.tagline,
      programmingLanguage: "R",
      runtimePlatform: "R",
      codeRepository: githubUrl(p),
      url: docsUrl(p),
    }));
  const doc = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", name: "pkgs.rsquaredacademy.com", url: "https://pkgs.rsquaredacademy.com/" },
      ...graph,
    ],
  };
  return `<script type="application/ld+json">\n${JSON.stringify(doc, null, 2)}\n</script>`;
}

const indent = (block, spaces) =>
  block
    .split("\n")
    .map((line) => (line.trim() ? " ".repeat(spaces) + line : line))
    .join("\n");

export function render(pkgs) {
  const template = readFileSync(path.join(root, "templates/index.html"), "utf8");
  // normalize to LF so the inlined script always matches the CSP hash (npm run hash)
  const init = readFileSync(path.join(root, "js/theme-init.js"), "utf8").replace(/\r\n/g, "\n");
  const html = template
    .replace("{{THEME_INIT}}", `<script>${init}</script>`)
    .replace("{{JSONLD}}", jsonLd(pkgs))
    .replace("{{CSS}}", esc(versionedUrl("css/packages.css")))
    .replace("{{JS_THEME}}", esc(versionedUrl("js/theme.js")))
    .replace("{{JS_CONSENT}}", esc(versionedUrl("js/consent.js")))
    .replace("{{SECTIONS}}", indent(renderSections(pkgs), 12));
  const leftover = html.match(/\{\{[A-Z_]+\}\}/g);
  if (leftover) {
    throw new Error(`template has unreplaced tokens: ${leftover.join(", ")}`);
  }
  return html;
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
    const out = process.env.BUILD_OUT
      ? path.resolve(root, process.env.BUILD_OUT)
      : path.join(root, "index.html");
    writeFileSync(out, render(pkgs));
    console.log(summary(pkgs));
    console.log(`wrote ${path.relative(root, out)}`);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
  }
}
