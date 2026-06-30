# Site Audit Product Specification

## Product Name

Site Audit — Digital Maturity Diagnostic Platform

## Current Context

The existing GapFinder pipeline currently operates as a digital tracking and performance readiness audit pipeline. It can crawl a website, capture network activity, identify tracking/vendor signals, fetch PageSpeed Insights data, generate scorecards, and produce client-facing reports.

The next product evolution is to move from a page-level audit tool into a journey-led diagnostic system.

The immediate commercial use case is external prospect audits where platform access has not yet been granted. The current UNSW prospecting workflow shows the problem clearly: before internal access is available, the team still needs to understand the website structure, user journeys, observable technology stack, tracking coverage, and likely measurement gaps.

## Strategic Product Thesis

Most audits answer:

> What tags exist?

Site Audit should answer:

> Can this business reliably measure the journeys that matter?

The product should combine external website observation, internal platform audits, maturity scoring, benchmarking, and automated report generation.

## Core Modules

### Module 1 — External Journey Mapper

Purpose:

- Discover and map important website journeys without platform access.
- Capture screenshots, URLs, page titles, navigation paths, and conversion stages.
- Produce a structured journey map that can be reviewed by consultants and later used by the scoring/reporting layers.

Primary input:

- Website URL.

Primary outputs:

- `journey-map.json`
- Screenshots for each journey step.
- URL/path inventory.
- Journey classification metadata.

Example journey patterns:

- Ecommerce: Homepage → Category → Product → Cart/Checkout.
- Lead generation: Homepage → Service → Case Study/Proof → Enquiry Form.
- Standard business: Homepage → Services/About → Contact.
- Blog/publisher: Homepage → Topic/Category → Article → Newsletter/Subscribe.
- Education: Homepage → Study Area → Course Search → Course Page → Apply/Enquire.
- SaaS/product: Homepage → Features/Product → Pricing/Demo/Signup.

Journey patterns must be inferred dynamically from the target URL and observed site signals. They should not be limited to one vertical, and profile-specific rules should be configurable.

Key rule:

- The tool should not blindly click every link in production mode. It should discover internal links, classify them, prioritise likely commercial/user journeys, and then visit/click selected paths.

### Module 2 — Tracking Observer

Purpose:

- Observe what tracking and event activity is visible from each journey step.

Captured evidence:

- Network requests.
- Tracking vendor endpoints.
- Cookies.
- `dataLayer` presence.
- `dataLayer` events.
- Consent state.
- Tag firing evidence.
- Query parameters.
- Cross-domain transitions.
- Iframes and embedded systems.

Important distinction:

- External audit findings must be evidence-based.
- Use `Observed`, `Not observed`, and `Unknown` rather than overclaiming.

Example acceptable wording:

- `Application tracking was not externally observable during the tested journey.`

Example wording to avoid:

- `Application tracking is missing.`

### Module 3 — Technology Stack Detector

Purpose:

- Detect the observable MarTech, AdTech, analytics, consent, experimentation, and experience stack.

Likely categories:

- Analytics: Adobe Analytics, GA4, etc.
- Tag management: GTM, Adobe Launch, Tealium, Segment.
- Consent: OneTrust, Cookiebot, etc.
- Experience analytics: Contentsquare, Hotjar, FullStory, etc.
- Advertising: Google Marketing Platform, Meta, LinkedIn, TikTok, Floodlight, DV360, SA360.
- CRM/forms: HubSpot, Marketo, Salesforce, Drupal forms, custom forms.
- Application systems: portals, third-party booking systems, Eventbrite, Calendly, iframe tools.

Primary outputs:

- Technology inventory.
- Vendor confidence level.
- Evidence source for each vendor.

### Module 4 — Digital Maturity Engine

Purpose:

- Convert external and internal audit evidence into a structured maturity score.

The scoring framework should start deterministic/rules-based, not AI-led.

Proposed scoring categories:

- Journey Measurement Coverage.
- Tracking Quality.
- Attribution Readiness.
- Consent and Privacy Readiness.
- Governance.
- Documentation.
- Platform Integration.
- Reporting Readiness.

Example score logic:

- Consent platform observed: positive signal.
- Cross-domain journey detected: positive business complexity signal.
- Same tracking vendor visible across journey stages: positive signal.
- Application portal transition with no observed analytics continuity: risk signal.
- Multiple isolated platforms with no obvious shared ID strategy: risk signal.
- Iframes used for key conversion actions: complexity/risk signal.

Primary output:

- `maturity-score.json`

### Module 5 — Internal Audit Engine

Purpose:

- Validate, enrich, and correct external findings once access is granted.

Planned inputs:

- GA4 Admin/API data.
- GTM container export/API data.
- Google Ads conversion setup.
- Adobe Launch/Analytics data where available.
- Client documentation: measurement plans, data dictionaries, naming standards, implementation logs.

GTM data to capture:

- Tags.
- Triggers.
- Variables.
- Folders.
- Workspaces/versions.
- Naming conventions.
- Dead or duplicate tags.
- Trigger conditions.
- Platform ownership.

GA4 data to capture:

- Events.
- Key events/conversions.
- Custom dimensions.
- Custom metrics.
- Audiences.
- Linked products.
- Data streams.
- Cross-domain settings.
- BigQuery links.
- Consent settings where available.

Primary output:

- `internal-audit.json`

### Module 6 — Automated Report Generator

Purpose:

- Convert structured audit outputs into standardised client deliverables.

Near-term outputs:

- Google Sheets audit workbook.
- Google Slides diagnostic deck.
- DOCX/PDF report.

Google Slides deck sections:

- Executive summary.
- Website/journey overview.
- Key journeys tested.
- Technology stack observed.
- Tracking observations.
- Measurement gaps.
- Maturity score.
- Priority recommendations.
- Roadmap.
- Appendix/evidence screenshots.

## Data Philosophy

The product must keep three layers separate:

1. Evidence — what was directly observed.
2. Inference — what the evidence suggests.
3. Recommendation — what should be done next.

This matters because external audits can only observe part of the truth. Internal audits validate or correct the external view.

## Benchmarking Layer

Benchmarking should be retained as a future moat.

Every completed audit should be saved in a normalised format so the product can compare future clients against:

- Industry averages.
- Business model averages.
- Platform maturity averages.
- Conversion journey complexity.
- Tracking coverage maturity.

Example future insight:

> Your external tracking maturity score is 58/100. Comparable education providers in the benchmark set average 71/100.

## Target Users

Primary internal users:

- Analytics consultants.
- Performance marketers.
- Paid media specialists.
- Agency account leads.

External buyers:

- Marketing leads.
- Digital leads.
- Heads of performance.
- CMOs.
- Analytics/MarTech owners.

## Current Priority

The immediate build priority is Module 1.

Build the Journey Mapper first because:

- It supports external audits before client access is granted.
- It matches the current UNSW prospecting workflow.
- It creates evidence that can feed Modules 2 and 3.
- It gives consultants a better discovery asset for calls and proposals.

## Non-Goals for v1

- Do not build full AI recommendations first.
- Do not build a full client-facing SaaS UI yet.
- Do not automate form submissions without permission.
- Do not attempt to prove internal tracking gaps from external evidence alone.
- Do not overbuild the Google Slides generator before the data model is stable.

## v1 Success Criteria

Given a website URL, the system can:

- Discover important internal links.
- Classify them into journey categories.
- Visit selected journey pages using Playwright.
- Capture screenshots and evidence.
- Detect observable technology/tracking signals.
- Save structured JSON outputs.
- Provide enough evidence for a consultant to build an external audit narrative.
