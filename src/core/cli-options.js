function getFlagValue(args, name) {
  const eqPrefix = `${name}=`;
  const eq = args.find((arg) => arg.startsWith(eqPrefix));
  if (eq) return eq.slice(eqPrefix.length);

  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("--"))
    return args[idx + 1];

  return null;
}

function parseIntegerFlag(args, name, fallback) {
  const raw = getFlagValue(args, name);
  if (raw === null) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseScopeOptions(args) {
  const explicitScope = getFlagValue(args, "--scope-path");
  const explicitMode = getFlagValue(args, "--scope-mode");
  const strict = args.includes("--scope-strict") || explicitMode === "strict";
  const global =
    args.includes("--global") ||
    explicitMode === "global" ||
    explicitMode === "none";

  return {
    scopePath: explicitScope !== null ? explicitScope : undefined,
    scopeMode: strict ? "strict" : "soft",
    global,
  };
}

function parseJourneyMapOptions(args) {
  return {
    ...parseScopeOptions(args),
    force: args.includes("--force"),
    maxPages: parseIntegerFlag(args, "--max-pages", 20),
  };
}

module.exports = {
  getFlagValue,
  parseIntegerFlag,
  parseJourneyMapOptions,
  parseScopeOptions,
};
