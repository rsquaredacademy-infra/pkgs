# Rsquared Academy R Packages

Catalog of the open-source R packages from [Rsquared Academy](https://www.rsquaredacademy.com) —
ten actively maintained packages on CRAN, each with its own pkgdown documentation site.

**Live: <https://pkgs.rsquaredacademy.com>**

## Package catalog

| Area | Packages |
| --- | --- |
| Regression and modelling | `olsrr`, `blorr`, `xplorerr` |
| Descriptive and inferential statistics | `descriptr`, `inferr`, `vistributions` |
| Data wrangling and segmentation | `rbin`, `rfm` |
| Utilities | `yahoofinancer`, `standby` |
| Archived | `nse2r` |

Every card links to CRAN, GitHub and the package's documentation; each package name is an
anchor (`https://pkgs.rsquaredacademy.com/#olsrr`).

## Local development

Node 18 or newer (developed and CI-tested on Node 24):

```sh
npm install
npm run build   # data/packages.yaml + templates/index.html -> index.html
npm run check   # every external link in index.html must return 200
npm run hash    # CSP hash for the inlined theme-init script
```

`index.html` is **generated** — edit `data/packages.yaml` and `templates/index.html` instead,
then rebuild. CI fails if the committed `index.html` drifts from the build output.

## Project layout

| Path | Purpose |
| --- | --- |
| `data/packages.yaml` | Single source of truth for the catalog (content, categories, links) |
| `templates/index.html` | Page shell — nav, hero, footer, head metadata |
| `build.mjs` | Node build: schema + embargo validation, renders `index.html` |
| `check.mjs` | Link validation over the generated page |
| `hash.mjs` | Prints the CSP hash for the inlined theme script |
| `css/packages.css` | Hand-written stylesheet — design tokens, listing cards, dark mode |
| `js/` | Vanilla JS only: theme toggle, analytics consent gate |
| `.github/workflows/ci.yml` | Build, drift check, link check on every push and PR |

## Adding a package

Add an entry to `data/packages.yaml`, drop the hex sticker at `images/hex-<name>.webp`,
record its size in `data/hex.json`, then rebuild. See [CONTRIBUTING.md](CONTRIBUTING.md) for
the full schema, conventions and the release-day rules.

## Notes

- The listing mirrors the design of [aravindhebbali.com/packages](https://www.aravindhebbali.com/packages/).
- Analytics run through GA4 behind a consent gate — nothing is sent to Google until a
  visitor chooses "Accept"; "Essential only" loads no analytics at all.
- HSTS is served by Netlify from its dashboard setting, deliberately not duplicated in
  `_headers` (a duplicate header would make browsers ignore it — see the comment there).
- The repository is public: unreleased package names are never committed. `build.mjs`
  enforces this with a released-name allowlist that only grows on release day.
