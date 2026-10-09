# Contributing to pkgs.rsquaredacademy.com

The portal is a generated static site. **Never hand-edit `index.html`** — it is
overwritten by the build.

## Local build

```sh
npm install
npm run build     # data/packages.yaml + templates/index.html -> index.html
npm run check     # link validation (every CRAN/GitHub/Docs URL must return 200)
npm run hash      # prints the CSP hash for the inlined theme script
```

## Adding a package

1. Add an entry to `data/packages.yaml` (fields below).
2. Add the hex sticker as `images/hex-<name>.webp` (square-ish, 360x417, <20 KB) and
   record its pixel size in `data/hex.json` — a flagship entry without a hex fails the build.
3. Make sure the docs site (`https://<name>.rsquaredacademy.com`) is live.
4. Run `npm run build`, review `index.html`, and commit it with the data change.

### Schema

```yaml
- name: olsrr                 # required; must be in the released-name allowlist in build.mjs
  tagline: "Tools for building linear regression models."   # required, one line
  blurb: "Diagnostics ... a fitted `lm`."                    # optional; backticks become <code>
  features: [Comprehensive Regression Output, ...]           # required for flagship track
  track: flagship            # flagship (hex card) | utility (text card) | archived
  category: regression       # regression | statistics | wrangling | utilities | archived
  cran: true                 # false hides the CRAN button (GitHub-only packages)
  status: active             # active | maintenance | pending-cran | deprecated | archived
  archived: "2023-08-07"     # archived track: date shown in the card
  revival: "v0.1.6, under revival"  # archived track: extra meta text
  github: rsquaredacademy/olsrr    # optional override; default rsquaredacademy/<name>
  docs: https://olsrr.rsquaredacademy.com  # optional override
```

Conventions: GitHub links always point at the `rsquaredacademy` org; URLs are derived
from the package name — specify `github`/`docs` only to deviate.

### Embargo (strict)

The repository is public. **Never commit unreleased package names** — not in
`packages.yaml`, not in any other file. The released-name allowlist in `build.mjs` is
the only gate; it grows exclusively on release day, in the release PR itself.

## Security headers

`_headers` carries the CSP. The only inline script is the theme no-flash detector
(`js/theme-init.js`); if you change it, run `npm run hash` and paste the new hash into
the `script-src` directive.
