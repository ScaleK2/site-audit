# GapFinder v2 TODO

## Immediate Priority

Build the external Journey Mapper first.

This is the next highest-leverage module because it turns the current manual Miro/browser audit workflow into a repeatable evidence capture system.

## Phase 0 — Repo Prep

- [x] Create `/docs/product-spec.md`
- [x] Create `/docs/architecture.md`
- [x] Create `/docs/roadmap.md`
- [x] Create `/src` folder
- [x] Create `TODO.md`
- [ ] Review README for accuracy after implementation starts
- [ ] Confirm existing audit key/path helper can be reused from current scripts

## Phase 1 — Journey Mapper v1

- [ ] Create `scripts/journey-map.js`
- [ ] Create `src/core/audit-key.js`
- [ ] Create `src/core/output-paths.js`
- [ ] Create `src/core/url-utils.js`
- [ ] Create `src/config/journey-keywords.js`
- [ ] Create `src/journey/discover-links.js`
- [ ] Create `src/journey/classify-links.js`
- [ ] Create `src/journey/capture-page-state.js`
- [ ] Create `src/journey/journey-runner.js`
- [ ] Visit homepage with Playwright
- [ ] Extract internal links
- [ ] Filter duplicate/noisy links
- [ ] Classify links into journey categories
- [ ] Visit selected priority pages
- [ ] Capture screenshots
- [ ] Capture page title and final URL
- [ ] Capture links found per page
- [ ] Write `journey-map.json`
- [ ] Add CLI options for `--max-pages`, `--force`, and `--scope-mode`

## Phase 2 — Tracking Observer

- [ ] Capture network requests per page
- [ ] Capture network hosts per page
- [ ] Capture script sources per page
- [ ] Capture cookies per page
- [ ] Detect `window.dataLayer`
- [ ] Extract `dataLayer` event names where available
- [ ] Detect iframes
- [ ] Detect forms
- [ ] Detect CTAs/buttons
- [ ] Add observable evidence to each journey step

## Phase 3 — Technology Stack Detector

- [ ] Build vendor dictionary
- [ ] Detect Adobe Analytics
- [ ] Detect Adobe Launch
- [ ] Detect GA4
- [ ] Detect GTM
- [ ] Detect Floodlight
- [ ] Detect Meta Pixel
- [ ] Detect TikTok Pixel
- [ ] Detect LinkedIn Insight Tag
- [ ] Detect OneTrust
- [ ] Detect Contentsquare
- [ ] Add confidence levels
- [ ] Write `technology-stack.json`

## Phase 4 — Maturity Scoring

- [ ] Define external maturity scoring rubric
- [ ] Separate evidence from inference
- [ ] Create `scripts/score-maturity.js`
- [ ] Create `src/scoring/maturity-score.js`
- [ ] Write `maturity-score.json`
- [ ] Ensure every score component links back to evidence

## Phase 5 — Main Pipeline Integration

- [ ] Add Journey Mapper into `scripts/run-gapfinder.js`
- [ ] Add `--skip-journey` option
- [ ] Confirm existing audit outputs still generate
- [ ] Confirm backwards compatibility

## Phase 6 — Reporting Outputs

- [ ] Define Google Sheet output schema
- [ ] Define Google Slides deck structure
- [ ] Create brand token config
- [ ] Create slide input builder from JSON
- [ ] Build first deck generator prototype

## Phase 7 — Internal Audit

- [ ] Define GTM export schema
- [ ] Define GA4 API collection requirements
- [ ] Create internal audit JSON contract
- [ ] Map internal findings to external journey categories

## Phase 8 — Benchmarking

- [ ] Define benchmark database schema
- [ ] Store normalised audit results
- [ ] Add industry/category metadata
- [ ] Create benchmark comparison logic

## Non-Negotiables

- [ ] Do not submit forms without explicit permission
- [ ] Do not overclaim external findings
- [ ] Use `Observed`, `Not observed`, and `Unknown`
- [ ] Keep extraction, scoring, and reporting separate
- [ ] Do not create duplicate `final/stable/v2` scripts
- [ ] Keep outputs deterministic and testable
