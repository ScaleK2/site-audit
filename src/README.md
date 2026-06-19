# src

This folder is for modular GapFinder application code.

Use `/scripts` for executable CLI entry points.
Use `/src` for reusable logic.

Recommended structure:

```text
src/
  config/
  core/
  journey/
  tracking/
  scoring/
  reporting/
```

Rules:
- Keep modules single-purpose.
- Do not write client-facing narrative in extraction modules.
- Return structured data.
- Let scripts handle CLI behaviour and file writing.
