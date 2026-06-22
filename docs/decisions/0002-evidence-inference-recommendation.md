# ADR 0002: Separate Evidence, Inference, and Recommendation

Date: 2026-06-19

## Status

Accepted

## Context

Site Audit must support external audits before platform access is granted. External audits can observe public website behaviour, network requests, cookies, scripts, DOM elements, screenshots, and transitions, but they cannot prove the full internal state of GTM, GA4, Adobe, consent platforms, or server-side systems.

## Decision

Site Audit will keep three layers separate:

1. **Evidence** — directly observed facts.
2. **Inference** — cautious interpretation of what the evidence may suggest.
3. **Recommendation** — suggested actions based on evidence and inference.

External audit statuses must use:

```text
Observed
Not observed
Unknown
```

The system must not convert `Not observed` into `missing` without internal validation.

## Consequences

- Extraction modules must return structured evidence, not client-facing narrative.
- Scoring modules must link every score component back to evidence.
- Reporting modules must preserve uncertainty and avoid overclaiming.
- Internal audits can later validate, enrich, or correct external findings.
