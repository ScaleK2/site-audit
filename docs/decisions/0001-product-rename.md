# ADR 0001: Product Naming and GapFinder Migration

Date: 2026-06-19

## Status

Accepted

## Context

The repository has historically used the name `GapFinder v2`. The product direction is now Site Audit: a Digital Maturity Assessment Platform with external audits, internal audits, maturity scoring, reporting, and benchmarking.

Existing scripts and generated report assets still use GapFinder naming. Renaming everything immediately would create unnecessary migration risk.

## Decision

- Use **Site Audit** as the product and repository name going forward.
- Treat **GapFinder** as the legacy/current pipeline name during migration.
- Keep existing executable scripts such as `scripts/run-gapfinder.js` working until replacement Site Audit commands are implemented.
- New documentation, data contracts, modules, and future commands should use Site Audit naming unless referring to legacy compatibility.

## Consequences

- Documentation can describe both names clearly during the transition.
- Existing users are not broken by an immediate script rename.
- Future work should avoid adding new `gapfinder`, `v2`, `final`, or `stable` names unless preserving compatibility with existing scripts.
