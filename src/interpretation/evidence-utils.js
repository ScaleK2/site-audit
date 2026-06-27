const path = require("path");

function allSteps(journeyMap) {
  return (journeyMap?.journeys || []).flatMap((journey) => journey.steps || []);
}

function visitedSteps(journeyMap) {
  return allSteps(journeyMap).filter((step) => step.status === "visited");
}

function successfulStepUrls(journeyMap) {
  return unique(
    visitedSteps(journeyMap).flatMap((step) => [step.url, step.final_url]).filter(Boolean),
  );
}

function selectedLinks(journeyMap) {
  return allSteps(journeyMap).flatMap((step) => step.selected_links || []);
}

function discoveryUrls(siteDiscovery) {
  const candidates = [
    ...(siteDiscovery?.representative_urls || []),
    ...(siteDiscovery?.candidate_urls || []),
  ];
  return candidates
    .map((candidate) => normalizeCandidate(candidate))
    .filter((candidate) => candidate.url);
}

function normalizeCandidate(candidate) {
  if (typeof candidate === "string") {
    return { url: candidate, text: "", page_type: "", source: "site_discovery" };
  }
  return {
    url: candidate?.url || "",
    text: candidate?.text || candidate?.label || candidate?.section || candidate?.page_type || "",
    title: candidate?.title || "",
    page_type: candidate?.page_type || candidate?.section || "",
    source: candidate?.source || "site_discovery",
    selection_reason: candidate?.selection_reason || "",
    confidence: candidate?.confidence || "",
    sources: candidate?.sources || [],
  };
}

function normalizeUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|msclkid$|yclid$)/i.test(key)) {
        url.searchParams.delete(key);
      }
    }
    const search = url.searchParams.toString();
    const pathname = url.pathname.replace(/\/$/, "") || "/";
    return `${url.protocol}//${url.hostname.toLowerCase()}${pathname}${search ? `?${search}` : ""}`;
  } catch (_error) {
    return String(value).trim().replace(/\/$/, "");
  }
}

function hostForUrl(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch (_error) {
    return "";
  }
}

function labelForUrl(value) {
  try {
    const url = new URL(value);
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] || url.hostname;
    return titleCase(last.replace(/[-_]+/g, " "));
  } catch (_error) {
    return String(value || "");
  }
}

function compactUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname === "/" ? "" : url.pathname}`.replace(/\/$/, "");
  } catch (_error) {
    return String(value);
  }
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))].sort();
}

function uniqueBy(items, keyFn) {
  const seen = new Map();
  for (const item of items || []) {
    const key = keyFn(item);
    if (key && !seen.has(key)) seen.set(key, item);
  }
  return [...seen.values()];
}

function joinList(values, limit = 8) {
  const items = unique(values).slice(0, limit);
  const suffix = unique(values).length > limit ? `; +${unique(values).length - limit} more` : "";
  return `${items.join("; ")}${suffix}`;
}

function titleCase(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function auditDirForJourneyMapPath(journeyMapPath) {
  const journeysDir = path.dirname(journeyMapPath);
  return path.basename(journeysDir) === "journeys"
    ? path.dirname(journeysDir)
    : path.dirname(journeyMapPath);
}

module.exports = {
  allSteps,
  auditDirForJourneyMapPath,
  compactUrl,
  discoveryUrls,
  hostForUrl,
  joinList,
  labelForUrl,
  normalizeUrl,
  selectedLinks,
  successfulStepUrls,
  titleCase,
  unique,
  uniqueBy,
  visitedSteps,
};
