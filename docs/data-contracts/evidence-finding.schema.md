# Evidence Finding Data Contract

Status: draft v1

This contract defines a shared finding shape for external evidence, inferred interpretations, recommendations, scoring inputs, and reporting.

## Principle

Every finding must distinguish between:

1. **Evidence** — what was directly observed.
2. **Inference** — what the evidence may suggest.
3. **Recommendation** — what action may be appropriate.

External audits must use `Observed`, `Not observed`, and `Unknown` rather than claiming internal truth from public evidence alone.

## Shape

```json
{
  "finding_id": "finding-001",
  "finding_type": "tracking_observation",
  "status": "Observed",
  "evidence_source": "network_request",
  "url": "https://www.example.com/",
  "evidence_value": "https://www.googletagmanager.com/gtm.js?id=GTM-XXXX",
  "confidence": "high",
  "interpretation": "Google Tag Manager was externally observable on the tested page.",
  "recommended_action": "Validate container ownership and event governance during internal audit.",
  "related_journey_id": "lead-generation-contact",
  "related_step_index": 1,
  "module": "external_journey_mapper"
}
```

## Required Fields

| Field                | Description                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `finding_id`         | Stable identifier within the audit output.                                                                    |
| `finding_type`       | Machine-readable finding type.                                                                                |
| `status`             | One of `Observed`, `Not observed`, or `Unknown`.                                                              |
| `evidence_source`    | Source such as `network_request`, `script_src`, `cookie`, `dom`, `screenshot`, `internal_api`, or `document`. |
| `url`                | URL where the evidence was collected, if applicable.                                                          |
| `evidence_value`     | Raw or normalised observed value.                                                                             |
| `confidence`         | `high`, `medium`, `low`, or `unknown`.                                                                        |
| `interpretation`     | Careful explanation of what the evidence suggests.                                                            |
| `recommended_action` | Optional action, preferably deferred until scoring/reporting layers.                                          |

## Confidence Levels

```text
high: directly observed evidence
medium: inferred from multiple supporting signals
low: weak or partial signal; requires validation
unknown: cannot determine externally
```

## External Audit Wording Rules

Acceptable:

```text
Application tracking was not externally observable during the tested journey.
```

Avoid:

```text
Application tracking is missing.
```

## Finding Types

Initial finding types:

```text
journey_observation
tracking_observation
technology_detection
consent_observation
cross_domain_transition
form_or_cta_observation
risk_signal
scoring_input
internal_validation
benchmark_context
```
