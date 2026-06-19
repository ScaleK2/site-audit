# Site Audit

Digital Maturity Assessment Platform.

Site Audit is evolving the legacy GapFinder tracking readiness audit pipeline into a journey-led digital maturity diagnostic system.

The product goal is to help consultants understand whether a business can reliably measure the user journeys that matter — before and after internal platform access is granted.

## Naming

- **Site Audit** is the product and repository name going forward.
- **GapFinder** refers to the existing/legacy audit scripts and report assets that will be migrated incrementally.
- Existing commands such as `scripts/run-gapfinder.js` remain documented until replacement commands are implemented.

## Current Capability

The existing GapFinder pipeline currently supports:

- Website crawling.
- HAR/network capture.
- Tracking and vendor inventory.
- PageSpeed Insights capture.
- Scorecard generation.
- DOCX/PDF client report generation.

Current main runner:

```bash
node scripts/run-gapfinder.js https://example.com
```

## Product Direction

The next product layer is a Playwright-powered External Audit / Journey Mapper.

Target flow:

```text
Website URL
  ↓
External Journey Mapper
  ↓
Tracking Observer
  ↓
Technology Stack Detector
  ↓
Digital Maturity Engine
  ↓
Internal Audit Engine
  ↓
Google Sheets / Google Slides / DOCX outputs
  ↓
Benchmark Dataset
```

## Repository Structure

```text
/docs
  product-spec.md
  architecture.md
  roadmap.md
  data-contracts/
  decisions/

/src
  reusable app logic

/scripts
  executable CLI scripts

/templates
  report templates

/data
  generated audit outputs; not committed

README.md
TODO.md
package.json
```

## Requirements

- Git
- Node.js LTS
- npm
- Python 3.10+
- Playwright browsers

Verify:

```bash
git --version
node -v
npm -v
python --version
```

## Installation

```bash
git clone https://github.com/ScaleK2/site-audit.git
cd site-audit
npm install
npx playwright install
pip install python-docx reportlab pandas openpyxl
```

Optional PDF export:

```bash
pip install docx2pdf
```

## Environment Setup

Create a local `.env` file:

```bash
cp .env.example .env
```

Set:

```env
PAGESPEED_API_KEY=your_key_here
```

`PSI_API_KEY` is also supported as a fallback.

## Running the Existing Pipeline

Standard audit:

```bash
node scripts/run-gapfinder.js https://example.com
```

Region/path-scoped audit:

```bash
node scripts/run-gapfinder.js https://www.anker.com/au/ --scope-mode=soft
```

Strict scope:

```bash
node scripts/run-gapfinder.js https://www.anker.com/au/ --scope-strict
```

Full PSI mode:

```bash
node scripts/run-gapfinder.js https://example.com --full
```

Skip PDF export:

```bash
node scripts/run-gapfinder.js https://example.com --no-pdf
```

> Note: older docs referenced `node run.js`, but this repository currently uses `scripts/run-gapfinder.js` as the available runner.

## Planned Journey Mapper Command

Target command:

```bash
node scripts/journey-map.js https://www.unsw.edu.au
```

Target outputs:

```text
data/{audit-key}/journeys/journey-map.json
data/{audit-key}/journeys/screenshots/*.png
```

The Journey Mapper should:

- Visit the homepage.
- Extract internal links.
- Dynamically infer the site type and likely journey patterns from the URL set and page signals.
- Classify links by journey relevance using configurable rules, not a fixed industry-only list.
- Visit selected priority pages.
- Capture screenshots and metadata.
- Capture observable tracking/technology signals.
- Avoid submitting forms.
- Avoid uncontrolled crawling.

## Key Documentation

Read these first:

- `docs/product-spec.md`
- `docs/architecture.md`
- `docs/roadmap.md`
- `docs/data-contracts/journey-map.schema.md`
- `docs/data-contracts/evidence-finding.schema.md`
- `docs/decisions/0001-product-rename.md`
- `docs/decisions/0002-evidence-inference-recommendation.md`
- `TODO.md`

## Existing Output Location

Outputs are stored in:

```text
data/{audit-key}/
```

Example:

```text
data/unsw.edu.au/
```

Region-scoped example:

```text
data/anker.com__au/
```

## Current Pipeline Architecture

```text
1. Crawl domain
2. Capture HAR
3. Extract tags and events
4. Analyse payload completeness
5. Run PSI
6. Generate scorecard
7. Generate DOCX/PDF
```

## Planned Pipeline Architecture

```text
1. Crawl domain
2. Map key journeys
3. Capture network/tracking evidence
4. Detect technology stack
5. Score digital maturity
6. Generate recommendations
7. Generate client deliverables
8. Store normalised benchmark record
```

## Development Rules

- Keep scripts single-purpose.
- Use `/scripts` for CLI entry points.
- Use `/src` for reusable logic.
- Separate evidence extraction from scoring.
- Separate scoring from reporting.
- Do not overclaim external findings.
- Use `Observed`, `Not observed`, and `Unknown` for external evidence.
- Do not create duplicate `final`, `stable`, or `v2` scripts.

## Updating the Repo

After changes:

```bash
git add .
git commit -m "Update Site Audit documentation"
git push
```

On another machine:

```bash
git pull
```
