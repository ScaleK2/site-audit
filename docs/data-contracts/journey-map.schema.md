# Journey Map Data Contract

Status: draft v1

This contract defines the target output for the External Audit / Journey Mapper.

## File Location

```text
data/{audit-key}/journeys/journey-map.json
```

Screenshots are stored beside the JSON output:

```text
data/{audit-key}/journeys/screenshots/*.png
```

## Design Goals

- Work across ecommerce, lead-generation, standard business, blog/publisher, education, SaaS/app, marketplace/directory, nonprofit/government, and unknown sites.
- Keep observed evidence separate from inference and recommendations.
- Preserve enough metadata for scoring, reporting, and future benchmarking.
- Avoid claiming that externally unobserved tracking is definitely absent.

## Top-Level Shape

```json
{
  "schema_version": "journey-map.v1",
  "audit": {},
  "site_profile": {},
  "journeys": [],
  "observations": {},
  "limits": []
}
```

## `audit`

Required fields:

```json
{
  "input_url": "https://www.example.com",
  "audit_key": "example.com",
  "started_at": "2026-06-19T00:00:00.000Z",
  "completed_at": "2026-06-19T00:01:00.000Z",
  "scope_mode": "soft",
  "scope_path": "",
  "max_pages": 20,
  "user_agent": "...",
  "runner": "scripts/journey-map.js"
}
```

## `site_profile`

The mapper should infer one or more site profiles dynamically from observed signals.

```json
{
  "primary_profile": "ecommerce",
  "profiles": [
    {
      "profile": "ecommerce",
      "confidence": "high",
      "signals": ["cart_path_observed", "product_url_pattern_observed"]
    },
    {
      "profile": "blog_or_publisher",
      "confidence": "medium",
      "signals": ["article_url_pattern_observed"]
    }
  ]
}
```

Supported initial profile values:

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

Profiles are not mutually exclusive.

## `journeys[]`

```json
{
  "journey_id": "ecommerce-product-purchase",
  "label": "Product purchase",
  "profile": "ecommerce",
  "category": "purchase",
  "priority": "high",
  "classification": {
    "method": "deterministic_rules",
    "confidence": "medium",
    "matched_patterns": ["category_to_product", "cart_or_checkout_observed"]
  },
  "steps": []
}
```

Recommended `category` values:

```text
purchase
lead_capture
contact
demo_or_signup
application
booking
content_engagement
subscription
support_or_service
account_or_portal
research_or_consideration
unknown
```

## `journeys[].steps[]`

```json
{
  "step_index": 1,
  "url": "https://www.example.com/",
  "final_url": "https://www.example.com/",
  "title": "Example",
  "http_status": 200,
  "screenshot": "journeys/screenshots/001-homepage.png",
  "status": "visited",
  "links_found": 120,
  "selected_links": [],
  "page_signals": {
    "forms_count": 0,
    "ctas": [],
    "iframes": [],
    "has_cart_link": false,
    "has_search": false
  },
  "tracking_signals": {
    "network_hosts": [],
    "script_sources": [],
    "vendors_observed": [],
    "data_layer_present": "Unknown",
    "data_layer_events": [],
    "cookies_count": 0
  },
  "notes": []
}
```

## `observations`

```json
{
  "technologies": [],
  "tracking": [],
  "consent": [],
  "risks": []
}
```

Each observation should use the evidence finding contract in `evidence-finding.schema.md`.

## `limits[]`

Use this to record crawl or evidence limitations.

```json
[
  {
    "code": "CONSENT_NOT_INTERACTED",
    "message": "Consent banner was observed but not interacted with.",
    "impact": "Tracking signals may differ after consent."
  }
]
```

## Dynamic Journey Logic Requirement

The Journey Mapper must not depend on one fixed vertical taxonomy. It should:

1. Discover candidate links.
2. Infer site profile(s) from observed signals.
3. Select profile-specific journey patterns from configuration.
4. Score candidate links against global and profile-specific rules.
5. Select bounded, deterministic journeys for capture.
6. Record the classification method and confidence.
