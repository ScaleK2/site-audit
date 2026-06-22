# Site Audit Roadmap

## Current Read

The highest-leverage next step is to make Site Audit journey-led while preserving useful legacy GapFinder assets.

The current tool already has useful page-level audit components. The next version should preserve those assets while adding a Playwright-based Journey Mapper that can replicate the current manual Miro-style website discovery workflow.

## Phase 0 — Documentation and Structure

Goal:

- Prepare the repository for Codex-assisted development.

Tasks:

- Create `/docs/product-spec.md`.
- Create `/docs/architecture.md`.
- Create `/docs/roadmap.md`.
- Create `/src` for modular app logic.
- Create or update `TODO.md`.
- Update `README.md` to reflect the product direction and current commands.

Definition of done:

- A developer can understand the product direction, architecture, and next tasks without needing extra context.

## Phase 0.5 — Data Contracts and Dynamic Journey Rules

Goal:

- Define the minimum data contracts and dynamic journey classification model before implementation.

Tasks:

- Define `journey-map.json` v1 schema.
- Define `evidence-finding` schema.
- Define dynamic site profiles such as ecommerce, lead generation, standard business, blog/publisher, education, SaaS/app, marketplace/directory, nonprofit/government, and unknown.
- Define configurable journey patterns for each profile.
- Define global and profile-specific keyword groups.

Definition of done:

- Journey Mapper v1 can produce predictable output while still adapting to different categories of websites.

## Phase 1 — Journey Mapper v1

Goal:

- Given a URL, generate an external journey map with screenshots and structured metadata.

Build:

- `scripts/journey-map.js`
- `src/journey/discover-links.js`
- `src/journey/classify-links.js`
- `src/journey/journey-runner.js`
- `src/journey/capture-page-state.js`
- `src/config/journey-keywords.js`

CLI:

```bash
node scripts/journey-map.js https://www.unsw.edu.au
```

Outputs:

```text
data/{audit-key}/journeys/journey-map.json
data/{audit-key}/journeys/screenshots/*.png
```

Acceptance criteria:

- Visits homepage.
- Extracts internal links.
- Filters noise.
- Infers one or more site profiles and classifies likely journey links dynamically.
- Visits top priority pages.
- Captures screenshots.
- Writes valid JSON.
- Does not submit forms.
- Does not leave the allowed domain/scope unless configured.

## Phase 2 — Tracking Observer Expansion

Goal:

- Attach tracking evidence to each journey step.

Build:

- Network request capture.
- Vendor endpoint extraction.
- Cookie capture.
- Script source extraction.
- `dataLayer` capture.
- Iframe detection.
- Form/CTA detection.

Outputs added to `journey-map.json`:

- `network_hosts`
- `vendors_observed`
- `cookies`
- `data_layer_present`
- `data_layer_events`
- `iframes`
- `forms`
- `ctas`

Acceptance criteria:

- Each journey step includes observable tracking evidence.
- Vendors are supported by evidence sources.
- Unknowns are not overstated.

## Phase 3 — Technology Stack Detector

Goal:

- Normalise detected technologies into a clear stack inventory.

Build:

- Vendor dictionary.
- Hostname/script matching rules.
- Confidence scoring.
- Technology categories.

Output:

```text
data/{audit-key}/analysis/technology-stack.json
```

Acceptance criteria:

- Groups technologies by category.
- Shows confidence level.
- Shows evidence URL/source.
- Supports Adobe, GTM, GA4, Meta, TikTok, LinkedIn, OneTrust, Contentsquare, Floodlight, DV360/SA360 indicators.

## Phase 4 — Digital Maturity Engine v1

Goal:

- Generate a deterministic external maturity score.

Build:

- `src/scoring/maturity-score.js`
- `scripts/score-maturity.js`

Output:

```text
data/{audit-key}/analysis/maturity-score.json
```

Initial categories:

- Journey Measurement Coverage.
- Tracking Coverage.
- Consent Readiness.
- Attribution Readiness.
- Integration Complexity.
- Governance Risk.

Acceptance criteria:

- Score is explainable.
- Every score component links back to evidence.
- External limits are clearly flagged.
- Does not pretend to know internal configuration.

## Phase 5 — Integrate Journey Mapper into Main Runner

Goal:

- Add journey mapping to the current full pipeline.

Updated flow:

```text
1. domain-crawl-to-urls.js
2. journey-map.js
3. har-capture.js
4. phase1-tag-inventory.js
5. psi-fetch.js
6. score-gapfinder.js
7. score-maturity.js
8. generate-gapfinder-docx-v2.py
```

Acceptance criteria:

- Existing commands still work.
- Journey mapping can be skipped via flag if needed.
- Existing outputs remain backwards compatible.

## Phase 6 — Google Sheets / Slides Output

Goal:

- Generate structured client-ready deliverables from audit data.

Build:

- Google Sheets output adapter.
- Google Slides output adapter.
- Brand token configuration.
- Slide layout mapping.

Deck sections:

- Executive summary.
- Key journeys tested.
- Journey map screenshots.
- Technology stack.
- Tracking observations.
- Maturity score.
- Priority gaps.
- Roadmap.

Acceptance criteria:

- Deck can be generated from JSON outputs.
- Formatting is controlled by config/template.
- No manual slide formatting required.

## Phase 7 — Internal Audit Engine

Goal:

- Use platform access to validate and enrich the external audit.

Build:

- GTM export/API parser.
- GA4 API collector.
- Google Ads conversion collector.
- Documentation ingestion process.

Outputs:

```text
data/{audit-key}/internal/internal-audit.json
```

Acceptance criteria:

- Lists tags, triggers, variables, events, conversions, audiences, linked products.
- Maps internal evidence back to user journeys where possible.
- Flags duplicates, dead tags, naming issues, and measurement gaps.

## Phase 8 — Benchmarking Layer

Goal:

- Store normalised audit results and compare clients against market patterns.

Build:

- Benchmark database schema.
- Industry categorisation.
- Audit result normalisation.
- Benchmark scoring.

Acceptance criteria:

- Can compare an audit against prior audits.
- Benchmarks are separated by industry/business type where possible.
- Benchmark claims show sample size and confidence.

## Recommended Immediate Codex Task

Start with Phase 1 only.

Codex prompt:

> Implement a new standalone `scripts/journey-map.js` command using Playwright. It should accept a website URL, create an audit output folder using the existing audit key/path conventions, visit the homepage, extract internal links, classify links using configurable keyword rules, visit the top priority links without submitting forms, capture screenshots and page metadata, and write `data/{audit-key}/journeys/journey-map.json`. Keep the implementation modular under `/src/journey` and `/src/core`.

## Main Risk

The main risk is overbuilding.

Do not build the full maturity engine, slide generator, and internal audit system before the Journey Mapper produces useful evidence.
