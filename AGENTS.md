# AGENTS.md

## Workflow

1. Work in build mode only after plan approval; `roadmap/` is the planning reference (always untracked).
2. Track work with the todo tool: one item per task, grouped by phase, updated in real time.
3. Atomic logical commits — one concern per commit, short single-line conventional message
   (`feat:` `fix:` `chore:` `docs:` `ci:` `security:` `refactor:` `test:`).
4. Push at the end of each phase. Standalone mid-phase pushes are allowed to test specific
   changes (e.g. verifying a GitHub Actions run) — don't wait for the phase to finish if a
   push answers a question.
5. The site deploys live from pushes to master (Netlify): never push a broken site. Add new
   files additively first; do the switch-over in a single atomic commit.
6. Never hand-edit the generated `index.html`. Edit `data/packages.yaml` +
   `templates/index.html`, then run `npm run build`.
7. Run `npm run build` and `npm run check` before committing; fix failures first.
8. Never commit unreleased/embargoed package names — the repo is public. Only the released-name
   allowlist in `build.mjs` may grow, on release day.
9. `roadmap/` is ALWAYS untracked (gitignored, never committed). It is the private planning
   reference — update it locally for decision history, it never enters git history.

## Project layout

- `data/packages.yaml` — single source of truth for the package catalog
- `templates/index.html` — page shell (edit this, not `index.html`)
- `build.mjs` — Node build: validates YAML, renders `index.html`
- `js/` — Vanilla JS only (theme toggle, consent gate); no frameworks
- `css/packages.css` — hand-written stylesheet (design tokens, listing cards)
- `npm run build` / `npm run check` / `npm run hash` — build / link check / CSP inline-script hash
