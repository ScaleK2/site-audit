# GapFinder v2

Digital Maturity Diagnostic Platform

GapFinder v2 is evolving from a tracking readiness audit tool into a journey-led digital maturity diagnostic system.

The product goal is to help consultants understand whether a business can reliably measure the user journeys that matter — before and after internal platform access is granted.

## Current Capability

GapFinder currently supports:

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

The next product layer is a Playwright-powered Journey Mapper.

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
```

## Repository Structure

```text
/docs
  product-spec.md
  architecture.md
  roadmap.md

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
git clone https://github.com/ScaleK2/gapfinder-v2.git
cd gapfinder-v2
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

Interactive menu:

```bash
node run.js
```

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
- Classify links by journey relevance.
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
git commit -m "Update GapFinder documentation"
git push
```

On another machine:

```bash
git pull
```
