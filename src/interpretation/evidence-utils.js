const path = require("path");

const DEFAULT_LIST_LIMIT = 6;
const DEFAULT_CELL_LIMIT = 600;

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

function joinList(values, limit = DEFAULT_LIST_LIMIT) {
  return formatEvidenceList(values, { limit, separator: "; " });
}

function formatEvidenceList(values, options = {}) {
  const limit = options.limit || DEFAULT_LIST_LIMIT;
  const separator = options.separator || "\n";
  const uniqueValues = unique((values || []).map((value) => safeCellValue(value)).filter(Boolean));
  const visible = uniqueValues.slice(0, limit);
  const suffix = uniqueValues.length > limit ? [`+${uniqueValues.length - limit} more`] : [];
  return truncateCell([...visible, ...suffix].join(separator), options.maxLength || DEFAULT_CELL_LIMIT);
}

function safeCellValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return formatEvidenceList(value);
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${labelFromKey(key)}: ${safeCellValue(item)}`)
      .filter((item) => item && !item.endsWith(": "))
      .join("; ");
  }
  return String(value);
}

function truncateCell(value, maxLength = DEFAULT_CELL_LIMIT) {
  const text = String(value || "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 11)).trim()}… +more`;
}

function titleCase(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function labelFromKey(value) {
  return titleCase(String(value || "").replace(/[_-]+/g, " "));
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
  formatEvidenceList,
  hostForUrl,
  joinList,
  labelForUrl,
  normalizeUrl,
  safeCellValue,
  selectedLinks,
  successfulStepUrls,
  titleCase,
  truncateCell,
  unique,
  uniqueBy,
  visitedSteps,
};
