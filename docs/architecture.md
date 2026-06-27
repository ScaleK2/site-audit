# Site Audit Architecture

## Architecture Principle

Site Audit should be built as a modular pipeline.

Each module should:

- Have a clear input contract.
- Produce a clear output file.
- Avoid client-facing narrative.
- Avoid hidden side effects.
- Be runnable independently.
- Feed later modules through structured JSON/CSV/XLSX, not hardcoded assumptions.

## Proposed Repository Structure

```text
/docs
  product-spec.md
  architecture.md
  roadmap.md

/src
  core app code
  journey mapping logic
  scoring logic
  shared utilities

/scripts
  executable CLI scripts
  orchestration scripts
  backwards-compatible existing scripts

/templates
  report and deck templates

/data
  generated audit outputs; not committed

README.md
TODO.md
package.json
```

## Current Existing Pipeline

Current runner:

```text
scripts/run-gapfinder.js
```

Current flow:

```text
1. domain-crawl-to-urls.js
2. har-capture.js
3. phase1-tag-inventory.js
4. psi-fetch.js
5. score-gapfinder.js
6. generate-gapfinder-docx-v2.py
```

Current key outputs:

```text
data/{audit-key}/analysis/phase1_inventory.xlsx
data/{audit-key}/analysis/unknown_vendors.csv
data/{audit-key}/analysis/psi.json
data/{audit-key}/analysis/scorecard.json
data/{audit-key}/analysis/probe_targets.json
```

## Proposed Future Pipeline

```text
Website URL
  ↓
Module 1: Journey Mapper
  ↓
Module 2: Tracking Observer
  ↓
Module 3: Technology Stack Detector
  ↓
Module 4: Digital Maturity Engine
  ↓
Module 5: Internal Audit Engine
  ↓
Module 6: Automated Report Generator
```

## v1 Pipeline

The first build should introduce journey mapping as an independent module.

```text
Website URL
  ↓
Crawl sitemap / homepage links
  ↓
Classify links
  ↓
Prioritise journey paths
  ↓
Visit selected pages with Playwright
  ↓
Capture screenshots + page metadata + network signals
  ↓
Write journey-map.json
```

## Recommended New Files

```text
src/
  config/
    journey-keywords.js
  core/
    audit-key.js
    output-paths.js
    url-utils.js
  journey/
    discover-links.js
    classify-links.js
    journey-runner.js
    capture-page-state.js
  tracking/
    detect-vendors.js
    extract-network-signals.js
    extract-datalayer.js
  scoring/
    maturity-score.js
  reporting/
    slides-input-builder.js

scripts/
  journey-map.js
```

## Output Structure

For a website such as `https://www.unsw.edu.au`, use the existing audit key pattern.

```text
data/unsw.edu.au/
  journeys/
    journey-map.json
    screenshots/
      001-homepage.png
      002-study.png
      003-undergraduate.png
  analysis/
    phase1_inventory.xlsx
    unknown_vendors.csv
    psi.json
    scorecard.json
    maturity-score.json
```

For region/path-scoped audits, preserve the existing audit key behaviour:

```text
data/anker.com__au/
```

## Journey Map JSON Contract

Suggested schema:

```json
{
  "audit": {
    "input_url": "https://www.unsw.edu.au",
    "audit_key": "unsw.edu.au",
    "started_at": "2026-06-19T00:00:00.000Z",
    "scope_mode": "soft",
    "max_pages": 20
  },
  "journeys": [
    {
      "journey_id": "study-undergraduate",
      "label": "Study / Undergraduate",
      "category": "student_acquisition",
      "priority": "high",
      "steps": [
        {
          "step_index": 1,
          "url": "https://www.unsw.edu.au/",
          "title": "UNSW Sydney",
          "screenshot": "journeys/screenshots/001-homepage.png",
          "status": "visited",
          "links_found": 120,
          "network_hosts": ["example.com"],
          "vendors_observed": ["Adobe Analytics", "OneTrust"],
          "data_layer_present": false,
          "cookies_count": 24,
          "notes": []
        }
      ]
    }
  ],
  "observations": {
    "technologies": [],
    "tracking": [],
    "consent": [],
    "risks": []
  }
}
```

## Dynamic Journey Classification

Journey classification must be dynamic because Site Audit will be run against ecommerce sites, lead-generation businesses, standard brochure sites, blogs/content publishers, education providers, SaaS products, marketplaces, charities, and other categories.

The Journey Mapper should not assume that education-style journeys such as `study`, `course`, or `apply` are always relevant. Instead, it should infer a site profile from observable signals and then apply configurable journey patterns.

### Site Profile Inference

The first pass should classify the site into one or more non-exclusive profiles based on URL paths, navigation labels, structured data, page titles, forms, product/listing patterns, cart/checkout paths, article patterns, and CTA language.

Initial profiles:

```text
ecommerce
lead_generation
standard_business
blog_or_publisher
education
saas_or_app
marketplace_or_directory
nonprofit_or_government
unknown
```

A site can have multiple profiles. For example, an education provider may also have ecommerce-style event bookings, and a B2B SaaS site may also have a blog and lead-generation journeys.

### Journey Pattern Selection

After profile inference, the mapper should select journey patterns from configuration. Examples:

```text
ecommerce: home → category/listing → product/detail → cart/checkout
lead_generation: home → service/category → service/detail → enquiry/contact
standard_business: home → about/services → proof/case-study → contact
blog_or_publisher: home → category/tag → article → newsletter/subscribe
education: home → study area → course/detail → apply/enquire
saas_or_app: home → product/features → pricing/demo/signup
marketplace_or_directory: home → search/category → listing/detail → booking/enquiry
nonprofit_or_government: home → program/service → eligibility/detail → apply/contact
```

These are defaults, not hardcoded assumptions. The implementation should keep profile definitions, journey patterns, keyword weights, exclusions, and per-profile priorities in configuration.

### Link Classification

Start with deterministic configurable rules. The first version can include global keywords and profile-specific keyword groups, then later evolve into a richer classifier.

Global high-intent keywords:

```text
study
undergraduate
postgraduate
international
course
degree
apply
application
contact
enquire
event
book
download
guide
fees
scholarship
professional-development
```

Low-priority / exclusion keywords:

```text
privacy
terms
accessibility
careers
staff
login
sitemap
media
newsroom
alumni
social
facebook
linkedin
instagram
youtube
```

Important caveat:

- Some low-priority pages may be strategically relevant for specific clients. These should be configurable, not hardcoded forever.

## Playwright Capture Contract

For every visited page, capture:

- Final URL.
- HTTP status where available.
- Page title.
- Screenshot path.
- Internal links discovered.
- Network request URLs.
- Network hostnames.
- Script src values.
- Cookies.
- Consent banner state where observable.
- `window.dataLayer` existence and event names.
- Iframes.
- Form presence.
- Buttons/CTAs.

## Click Strategy

v1 should prefer visiting link `href`s rather than uncontrolled clicking.

Use clicking only when:

- A CTA has no direct href.
- A menu must be opened to reveal important navigation links.
- A modal or popup blocks the next step.

Do not:

- Submit forms.
- Click payment buttons.
- Create accounts.
- Trigger destructive actions.
- Crawl authenticated portals without explicit permission.

## Evidence Model

Every finding should include:

```text
finding_id
finding_type
evidence_source
url
evidence_value
confidence
interpretation
recommended_action
```

Confidence levels:

- High: directly observed.
- Medium: inferred from multiple signals.
- Low: weak signal; needs internal validation.
- Unknown: cannot determine externally.

## Internal Audit Architecture

Internal audits should not replace external audits. They should validate and enrich them.

Future internal inputs:

```text
GA4 API
GTM API / container export
Google Ads API
Adobe Launch / Adobe Analytics export
Search Console API
Client documentation
```

Internal audit outputs should map back to external journey categories where possible.

Example:

- External journey detects `Application Portal`.
- Internal GTM/GA4 audit validates whether application start/submit events exist.
- Maturity engine scores attribution continuity.

## Reporting Architecture

Reporting should consume structured outputs, not scrape terminal logs.

Deck/report input:

```text
journey-map.json
phase1_inventory.xlsx or parsed JSON equivalent
scorecard.json
maturity-score.json
internal-audit.json when available
```

Slide generator should be an output adapter, not the brain of the system.

## Design Constraints

- Keep scripts boring and predictable.
- Do not create `final`, `stable`, or duplicate script versions.
- Separate evidence extraction from scoring.
- Separate scoring from narrative.
- Keep client-specific assumptions configurable.
- Make outputs easy for Codex to test.
