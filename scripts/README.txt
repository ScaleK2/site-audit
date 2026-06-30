# Site Audit Scripts

This folder contains executable CLI entry points for the Site Audit system.

Scripts are single-responsibility, deterministic, and write outputs only to defined locations in the parent directory.

No script should contain business narrative or client-facing language. Reusable logic should live in `/src`; scripts should parse CLI arguments, call reusable modules, and write declared outputs.

---

## Script Contracts

Each script must define:
- Inputs (what it reads)
- Outputs (what it writes)
- Side effects (if any)

Scripts must never:
- write data into the scripts folder
- create ad-hoc files
- duplicate functionality of another script

---

## Current Scripts

### domain-crawl-to-urls.js
**Purpose**
- Discover internal URLs for a given domain or scoped path.

**Inputs**
- Domain URL or scoped URL as a CLI argument.
- Optional scope flags such as `--scope-mode=soft`, `--scope-strict`, `--scope-path`, and `--global`.

**Outputs**
- `data/{audit-key}/urls.txt`
- `data/{audit-key}/urls_probe.txt` when `--probe` is used.
- `data/{audit-key}/analysis/probe_targets.json` when probe targets are generated.

**Notes**
- Sitemap-first with browser crawl fallback.
- Strict limits on depth and volume.
- Strips query strings and fragments by default.

---

### har-capture.js
**Purpose**
- Capture runtime network activity for each URL discovered by `domain-crawl-to-urls.js`.

**Inputs**
- `data/{audit-key}/urls.txt`
- `data/{audit-key}/urls_probe.txt` when `--probe` is used.

**Outputs**
- `data/{audit-key}/har/*.har`
- `data/{audit-key}/har_probe/*.har` when `--probe` is used.

**Notes**
- Uses Playwright + Chromium.
- Hardened for stability and repeatability.
- One HAR per URL.
- Skips URLs already captured unless `--force` is used.

---

### phase1-tag-inventory.js
**Purpose**
- Extract tag, vendor, and event inventory from captured HAR files.

**Inputs**
- `data/{audit-key}/har/*.har`
- `data/{audit-key}/har_probe/*.har` when `--probe` is used.

**Outputs**
- `data/{audit-key}/analysis/phase1_inventory.xlsx`
- `data/{audit-key}/analysis/unknown_vendors.csv`

**Notes**
- Extraction only; maturity scoring should remain separate.

---

### psi-fetch.js
**Purpose**
- Fetch PageSpeed Insights data for selected audit URLs.

**Inputs**
- Audit input URL and PageSpeed API key from environment.

**Outputs**
- `data/{audit-key}/analysis/psi.json`

---

### score-gapfinder.js
**Purpose**
- Generate the existing legacy GapFinder scorecard from current pipeline outputs.

**Outputs**
- `data/{audit-key}/analysis/scorecard.json`

**Notes**
- This is separate from the future Site Audit maturity score.

---

### generate-gapfinder-docx-v2.py
**Purpose**
- Generate the existing DOCX/PDF report from current pipeline outputs.

**Outputs**
- `data/{audit-key}/report/*`

---

### run-gapfinder.js
**Purpose**
- Run the existing legacy GapFinder pipeline.

**Notes**
- This remains the current available runner until a Site Audit orchestrator is implemented.

---

### pw-check.js
**Purpose**
- Check Playwright/browser availability.

---

## Planned Scripts

### journey-map.js
**Purpose**
- Run the External Audit / Journey Mapper v1.

**Inputs**
- Website URL.
- Optional `--max-pages`, `--force`, and scope flags.

**Outputs**
- `data/{audit-key}/journeys/journey-map.json`
- `data/{audit-key}/journeys/screenshots/*.png`

**Notes**
- Must infer site profile(s) dynamically and apply configurable journey patterns.
- Must not submit forms or perform destructive actions.

---

### score-maturity.js
**Purpose**
- Generate the future deterministic Site Audit maturity score.

**Outputs**
- `data/{audit-key}/analysis/maturity-score.json`

---

## Deprecated Scripts

Deprecated scripts must be moved to:

```text
scripts/deprecated/
```

They should never be edited again.

If something needs to change, create a new responsibility, not a new version.

---

## Design Rule (Non-Negotiable)

If you feel the urge to create:
- `*-stable.js`
- `*-v2.js`
- `*-final.js`

Stop.

Fix the existing script or delete it.

This folder should be boring, predictable, and trustworthy.
