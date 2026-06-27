const { isWithinScope } = require("../core/scope");
const { normaliseUrl, stableUrlSort } = require("../core/url-utils");

const DEFAULT_MAX_CANDIDATE_PAGES = 12;

function buildCandidateJourneyPool({ homepageLinks = [], auditContext = {}, audit }) {
  const byUrl = new Map();
  const maxCandidatePages = Math.max(
    0,
    auditContext?.limits?.maxCandidatePages || DEFAULT_MAX_CANDIDATE_PAGES,
  );

  for (const link of homepageLinks || []) {
    addCandidate(byUrl, normalizeHomepageLink(link, audit), audit);
  }

  const contextCandidates = (auditContext?.candidateJourneyPages || [])
    .slice(0, maxCandidatePages)
    .map((candidate) => normalizeContextCandidate(candidate, auditContext, audit));

  for (const candidate of contextCandidates) addCandidate(byUrl, candidate, audit);

  return [...byUrl.values()].sort(stableUrlSort);
}

function addCandidate(byUrl, candidate, audit) {
  if (!candidate?.url) return;
  if (audit && !isWithinScope(candidate.url, audit)) return;

  const existing = byUrl.get(candidate.url);
  if (!existing) {
    byUrl.set(candidate.url, candidate);
    return;
  }

  if (!existing.text && candidate.text) existing.text = candidate.text;
  existing.sources = mergeArrays(existing.sources, candidate.sources);
  existing.source_details = mergeArrays(
    existing.source_details,
    candidate.source_details,
  );

  if (existing.source !== candidate.source) existing.source = "multiple";
  if (!existing.page_type && candidate.page_type)
    existing.page_type = candidate.page_type;
  if (!existing.selection_reason && candidate.selection_reason)
    existing.selection_reason = candidate.selection_reason;
  if (!existing.confidence && candidate.confidence)
    existing.confidence = candidate.confidence;
}

function normalizeHomepageLink(link, audit) {
  const url = normaliseUrl(link?.url, audit?.homeUrl);
  return {
    url,
    text: link?.text || "",
    source: "homepage_discovered_links",
    page_type: link?.page_type || "",
    selection_reason: "homepage_link",
    confidence: link?.confidence || "",
    sources: ["homepage_discovered_links"],
    source_details: link?.sources || [],
  };
}

function normalizeContextCandidate(candidate, auditContext, audit) {
  const url = normaliseUrl(candidate?.url, audit?.homeUrl);
  const source = candidate?.source || auditContext?.source || "audit_context";
  return {
    url,
    text: candidate?.text || labelForCandidate(candidate),
    source,
    page_type: candidate?.page_type || "",
    selection_reason: candidate?.selection_reason || "audit_context_candidate",
    confidence: candidate?.confidence || "",
    sources: mergeArrays([source], candidate?.sources || []),
    source_details: candidate?.source_details || [],
  };
}

function labelForCandidate(candidate = {}) {
  return candidate.text || candidate.label || candidate.page_type || candidate.section || "";
}

function mergeArrays(...values) {
  const merged = [];
  for (const value of values.flat()) {
    if (!value) continue;
    if (!merged.includes(value)) merged.push(value);
  }
  return merged;
}

module.exports = {
  DEFAULT_MAX_CANDIDATE_PAGES,
  buildCandidateJourneyPool,
};
