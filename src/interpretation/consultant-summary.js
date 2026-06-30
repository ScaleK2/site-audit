const {
  allSteps,
  compactUrl,
  discoveryUrls,
  formatEvidenceList,
  hostForUrl,
  selectedLinks,
  successfulStepUrls,
  unique,
  visitedSteps,
} = require("./evidence-utils");
const { buildFollowUpQuestions } = require("./follow-up-questions");
const { buildJourneyFamilies, summarizeCoverage } = require("./journey-families");
const { buildTechnologyGroups } = require("./technology-groups");

function buildConsultantSummary(journeyMap, siteDiscovery = null) {
  const context = buildSummaryContext(journeyMap, siteDiscovery);
  return {
    executive_snapshot: buildExecutiveSnapshot(context),
    audit_scope: buildAuditScope(context),
    digital_estate: buildDigitalEstate(context),
    journey_coverage: buildJourneyCoverage(context),
    coverage_gaps: buildCoverageGaps(context),
    technology_tracking: buildTechnologyTracking(context),
    consent_summary: buildConsentSummary(context),
    evidence_limitations: buildEvidenceLimitations(context),
    follow_up_questions: context.followUpQuestions,
  };
}

function buildSummaryContext(journeyMap, siteDiscovery) {
  const journeyFamilies = buildJourneyFamilies(journeyMap, siteDiscovery);
  const coverage = summarizeCoverage(journeyFamilies, journeyMap, siteDiscovery);
  const technologyGroups = buildTechnologyGroups(journeyMap);
  const followUpQuestions = buildFollowUpQuestions({
    journeyMap,
    siteDiscovery,
    journeyFamilies,
    coverage,
  });
  const discoveredCandidates = discoveryUrls(siteDiscovery);
  const visitedUrls = successfulStepUrls(journeyMap);
  const visitedHosts = unique(visitedUrls.map(hostForUrl).filter(Boolean));
  const discoveredHosts = unique(discoveredCandidates.map((item) => hostForUrl(item.url)).filter(Boolean));

  return {
    journeyMap,
    siteDiscovery,
    journeyFamilies,
    coverage,
    technologyGroups,
    followUpQuestions,
    discoveredCandidates,
    visitedUrls,
    visitedHosts,
    discoveredHosts,
    visitedSteps: visitedSteps(journeyMap),
    allSteps: allSteps(journeyMap),
    selectedLinks: selectedLinks(journeyMap),
  };
}

function buildExecutiveSnapshot(context) {
  const { journeyMap, siteDiscovery, coverage, journeyFamilies, visitedHosts, discoveredHosts } = context;
  const audit = journeyMap.audit || {};
  const profile = journeyMap.site_profile || {};
  const validated = journeyFamilies.filter((item) => item.status === "Validated");
  const discovered = journeyFamilies.filter((item) => item.status !== "Not observed");
  const sources = [
    siteDiscovery ? "Discovery" : "",
    context.visitedSteps.length ? "Journey Mapping" : "",
    journeyMap.consent ? "Consent" : "",
    hasNetworkEvidence(journeyMap) ? "Network" : "",
  ].filter(Boolean);

  return {
    coverage: coverage.label,
    coverage_summary: coverage.observation,
    primary_profile: profile.primary_profile || "unknown",
    sub_profile: profile.sub_profile || "",
    input_url: audit.input_url || "",
    audit_type: "External journey audit",
    journey_families_validated: validated.length,
    journey_families_discovered: discovered.length,
    domains_visited: visitedHosts.length,
    domains_discovered: discoveredHosts.length || visitedHosts.length,
    discovery_available: Boolean(siteDiscovery),
    evidence_sources: sources,
  };
}

function buildAuditScope(context) {
  const { journeyMap, siteDiscovery, discoveredCandidates, visitedSteps: steps } = context;
  const audit = journeyMap.audit || {};
  return {
    seed_url: audit.input_url || "",
    audit_key: audit.audit_key || "",
    audit_date: audit.completed_at || "",
    representative_discovery: Boolean(siteDiscovery),
    same_site_subdomains_included: Boolean(audit.allow_subdomains),
    candidate_pages: discoveredCandidates.length,
    visited_pages: steps.length,
    maximum_pages: audit.max_pages || "",
    site_discovery_available: Boolean(siteDiscovery),
  };
}

function buildDigitalEstate(context) {
  const discoveredFamilies = context.journeyFamilies.filter((item) => item.status !== "Not observed");
  return {
    domains_discovered: context.discoveredHosts,
    journey_families_discovered: discoveredFamilies.map((item) => item.family),
    representative_pages_discovered: context.discoveredCandidates.map((candidate) => ({
      label: candidate.text || candidate.page_type || compactUrl(candidate.url),
      url: candidate.url,
      page_type: candidate.page_type || "",
    })),
  };
}

function buildJourneyCoverage(context) {
  return context.journeyFamilies.map((family) => ({
    journey_family: family.family,
    status: family.status,
    journey_observed: family.status === "Validated"
      ? family.narrative || "Representative journey was observed in visited audit steps."
      : family.status === "Discovered only"
        ? `Representative ${family.family} evidence was discovered but no ${family.family} journey was validated.`
        : `${family.family} was not observed in discovered or visited evidence for this audit.`,
    evidence: family.evidence,
    follow_up_question: family.status === "Discovered only"
      ? `${family.family} evidence was discovered but not represented during the audit. Should ${family.family} be considered in scope?`
      : "",
  }));
}

function buildCoverageGaps(context) {
  const discoveredOnly = context.journeyFamilies.filter((item) => item.status === "Discovered only");
  const failedSkipped = context.allSteps.filter((step) => ["failed", "skipped"].includes(step.status));
  const gaps = discoveredOnly.map((family) => ({
    area: family.family,
    status: "Discovered only",
    context: `${family.family} appeared in discovery evidence but was not represented in visited journey steps.`,
    evidence: family.evidence,
    follow_up_question: `${family.family} evidence was discovered but not represented during the audit. Should ${family.family} be considered in scope?`,
  }));

  if (context.discoveredHosts.length > context.visitedHosts.length) {
    const unvisitedHosts = context.discoveredHosts.filter((host) => !context.visitedHosts.includes(host));
    gaps.push({
      area: "Same-site domains",
      status: "Discovered only",
      context: "Some same-site domains were discovered but were not represented by visited journey steps.",
      evidence: unvisitedHosts,
      follow_up_question: "Some same-site domains were discovered but not represented. Which of these domains should be considered in scope?",
    });
  }

  if (failedSkipped.length) {
    gaps.push({
      area: "Failed or skipped pages",
      status: "Observed",
      context: `${failedSkipped.length} selected journey steps failed or were skipped during capture.`,
      evidence: failedSkipped.map((step) => compactUrl(step.url || step.final_url)),
      follow_up_question: "Failed or skipped pages were observed. Should these journey steps be retried or reviewed manually?",
    });
  }

  return gaps;
}

function buildTechnologyTracking(context) {
  return context.technologyGroups.map((group) => ({
    category: group.group,
    observed_evidence: group.items,
    notes: group.items.length
      ? `Observed ${group.group.toLowerCase()} evidence includes the listed hosts, scripts, or vendors.`
      : `No ${group.group.toLowerCase()} evidence was observed in the captured audit data.`,
  }));
}

function buildConsentSummary(context) {
  const consent = context.journeyMap.consent || {};
  const preHosts = consent.pre_consent?.network_hosts || [];
  const postHosts = consent.post_consent?.network_hosts || [];
  return {
    interaction_observed: Boolean(consent.status && consent.status !== "not_observed"),
    status: consent.status || "not_observed",
    cmp_detected: Boolean((consent.platforms_observed || []).length),
    platforms_observed: consent.platforms_observed || [],
    pre_consent_evidence: Boolean(preHosts.length || (consent.pre_consent?.script_sources || []).length),
    post_consent_evidence: Boolean(postHosts.length || (consent.post_consent?.script_sources || []).length),
    network_evidence: Boolean(preHosts.length || postHosts.length),
    note: "Consent evidence is observational and does not validate legal compliance.",
  };
}

function buildEvidenceLimitations(context) {
  const journeyLimits = (context.journeyMap.limits || []).map((limit) => ({
    topic: limit.code || "Audit limit",
    context: [limit.message, limit.impact].filter(Boolean).join(" "),
    evidence: limit.code || "",
  }));
  const discoveryLimits = (context.siteDiscovery?.limits || []).map((limit) => ({
    topic: limit.code || "Discovery limit",
    context: [limit.message, limit.impact].filter(Boolean).join(" "),
    evidence: limit.code || "",
  }));
  return [...journeyLimits, ...discoveryLimits];
}

function hasNetworkEvidence(journeyMap) {
  return allSteps(journeyMap).some((step) => (
    (step.tracking_signals?.network_hosts || []).length ||
    (step.tracking_signals?.script_sources || []).length ||
    (step.tracking_signals?.vendors_observed || []).length
  ));
}

function summaryList(values, limit = 6) {
  return formatEvidenceList(values, { limit });
}

module.exports = {
  buildConsultantSummary,
  summaryList,
};
