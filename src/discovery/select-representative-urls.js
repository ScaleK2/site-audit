const DEFAULT_LIMITS = {
  maxRepresentativeUrls: 40,
  maxPerPageType: 3,
};

const SECTION_ORDER = [
  "seed",
  "subdomain",
  "homepage",
  "study",
  "apply",
  "course_search",
  "research",
  "faculty",
  "event",
  "news",
  "alumni",
  "giving",
  "contact",
  "portal",
  "support",
  "product",
  "category",
  "blog",
  "policy",
  "unknown",
];

function selectRepresentativeUrls({ seedUrl, candidates = [], limits = {} }) {
  const resolvedLimits = { ...DEFAULT_LIMITS, ...limits };
  const selected = [];
  const seenUrls = new Set();
  const seenPatterns = new Set();
  const pageTypeCounts = new Map();

  const add = (candidate, reason, section = candidate.page_type || "unknown") => {
    if (!candidate?.url || seenUrls.has(candidate.url)) return false;
    if (selected.length >= resolvedLimits.maxRepresentativeUrls) return false;

    const pageType = candidate.page_type || "unknown";
    if (reason !== "seed_url" && reason !== "same_site_subdomain") {
      const count = pageTypeCounts.get(pageType) || 0;
      if (count >= resolvedLimits.maxPerPageType) return false;
    }

    const patternKey = `${candidate.host}|${pageType}|${candidate.normalized_pattern}`;
    if (reason === "representative_page_type" && seenPatterns.has(patternKey)) {
      return false;
    }

    seenUrls.add(candidate.url);
    seenPatterns.add(patternKey);
    pageTypeCounts.set(pageType, (pageTypeCounts.get(pageType) || 0) + 1);
    selected.push({
      url: candidate.url,
      host: candidate.host,
      page_type: pageType,
      section,
      selection_reason: reason,
      sources: candidate.sources || [],
    });
    return true;
  };

  const sortedCandidates = [...candidates].sort(candidateSort);
  const seedCandidate = sortedCandidates.find((candidate) => candidate.url === seedUrl) || {
    url: seedUrl,
    host: hostForUrl(seedUrl),
    page_type: "homepage",
    section: "seed",
    normalized_pattern: "/",
    sources: ["seed"],
  };
  add(seedCandidate, "seed_url", "seed");

  const subdomainStarts = subdomainStartCandidates(sortedCandidates);
  for (const candidate of subdomainStarts) add(candidate, "same_site_subdomain", "subdomain");

  for (const candidate of sortedCandidates.filter((item) => item.path_depth <= 1)) {
    add(candidate, "major_top_level_section", candidate.page_type || "unknown");
  }

  for (const candidate of sortedCandidates) {
    add(candidate, "representative_page_type", candidate.page_type || "unknown");
  }

  return selected.sort(representativeSort);
}

function subdomainStartCandidates(candidates) {
  const byHost = new Map();
  for (const candidate of candidates) {
    if (!candidate.is_subdomain) continue;
    if (!byHost.has(candidate.host)) {
      byHost.set(candidate.host, {
        ...candidate,
        url: originForUrl(candidate.url),
        page_type: candidate.page_type || "unknown",
        normalized_pattern: "/",
      });
    }
  }
  return [...byHost.values()].sort(candidateSort);
}

function candidateSort(a, b) {
  const sectionDelta = sectionRank(a.page_type) - sectionRank(b.page_type);
  if (sectionDelta !== 0) return sectionDelta;
  const depthDelta = (a.path_depth || 0) - (b.path_depth || 0);
  if (depthDelta !== 0) return depthDelta;
  return String(a.url || "").localeCompare(String(b.url || ""));
}

function representativeSort(a, b) {
  const sectionDelta = sectionRank(a.section || a.page_type) - sectionRank(b.section || b.page_type);
  if (sectionDelta !== 0) return sectionDelta;
  return String(a.url || "").localeCompare(String(b.url || ""));
}

function sectionRank(section) {
  const idx = SECTION_ORDER.indexOf(section || "unknown");
  return idx === -1 ? SECTION_ORDER.length : idx;
}

function hostForUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function originForUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}/`;
  } catch {
    return url;
  }
}

module.exports = {
  SECTION_ORDER,
  selectRepresentativeUrls,
};
