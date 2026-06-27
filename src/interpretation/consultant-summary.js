const {
  allSteps,
  compactUrl,
  discoveryUrls,
  hostForUrl,
  joinList,
  selectedLinks,
  successfulStepUrls,
  unique,
  visitedSteps,
} = require("./evidence-utils");
const { buildFollowUpQuestions } = require("./follow-up-questions");
const { buildJourneyFamilies, summarizeCoverage } = require("./journey-families");
const { buildTechnologyGroups } = require("./technology-groups");

function buildConsultantSummaryRows(journeyMap, siteDiscovery) {
  const context = buildSummaryContext(journeyMap, siteDiscovery);
  return [
    ...buildSiteSummaryRows(context),
    ...buildAuditScopeRows(context),
    ...buildDigitalEstateRows(context),
    ...buildJourneyCoverageRows(context),
    ...buildCoverageGapRows(context),
    ...buildTechnologyTrackingRows(context),
    ...buildConsentRows(context),
    ...buildEvidenceLimitationRows(context),
    ...buildFollowUpRows(context),
  ];
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

function buildSiteSummaryRows(context) {
  const { journeyMap, coverage } = context;
  const audit = journeyMap.audit || {};
  const profile = journeyMap.site_profile || {};
  return [
    row(
      "Site Summary",
      "Audit overview",
      "Observed",
      `This workbook summarises a deterministic Site Audit for ${audit.input_url || audit.site_host || audit.audit_key || "the supplied site"}.`,
      `Audit key: ${audit.audit_key || ""}; completed: ${audit.completed_at || ""}`,
    ),
    row(
      "Site Summary",
      "Detected profile",
      "Observed",
      `The site profile evidence indicates primary profile ${profile.primary_profile || "unknown"}${profile.sub_profile ? ` with sub-profile ${profile.sub_profile}` : ""}.`,
      profile.profiles?.[0]?.confidence ? `Profile confidence: ${profile.profiles[0].confidence}` : "Profile evidence from journey-map.json",
    ),
    row(
      "Site Summary",
      "Coverage label",
      coverage.label,
      coverage.observation,
      coverage.evidence,
    ),
  ];
}

function buildAuditScopeRows(context) {
  const { journeyMap, siteDiscovery, discoveredCandidates, visitedSteps: steps } = context;
  const audit = journeyMap.audit || {};
  const profile = journeyMap.site_profile || {};
  return [
    row("Audit Scope", "Seed URL / input URL", "Observed", audit.input_url || "", audit.input_url || ""),
    row("Audit Scope", "Audit key", "Observed", audit.audit_key || "", audit.audit_key || ""),
    row("Audit Scope", "Primary profile", "Observed", profile.primary_profile || "unknown", profile.primary_profile || ""),
    row("Audit Scope", "Sub-profile", profile.sub_profile ? "Observed" : "Not observed", profile.sub_profile || "No sub-profile was identified in the audit output.", profile.sub_profile || ""),
    row("Audit Scope", "Same-site subdomains included", audit.allow_subdomains ? "Observed" : "Not observed", audit.allow_subdomains ? "Same-site subdomain support was enabled for this audit." : "Same-site subdomain support was not enabled for this audit.", `Site host: ${audit.site_host || ""}`),
    row("Audit Scope", "Candidate pages considered", "Observed", `${discoveredCandidates.length} representative discovery candidates were available${siteDiscovery ? "." : " from journey evidence only."}`, `Discovery available: ${siteDiscovery ? "yes" : "no"}`),
    row("Audit Scope", "Visited pages", "Observed", `${steps.length} journey steps were visited successfully.`, `Max pages: ${audit.max_pages || ""}`),
    row("Audit Scope", "Audit completed date", audit.completed_at ? "Observed" : "Not observed", audit.completed_at || "No completed date was present in the audit output.", audit.completed_at || ""),
    row("Audit Scope", "Site discovery available", siteDiscovery ? "Observed" : "Not observed", siteDiscovery ? "site-discovery.json was available and used for consultant summary context." : "site-discovery.json was not available; summary uses journey-map.json only.", siteDiscovery?.output?.site_discovery_json_path || ""),
  ];
}

function buildDigitalEstateRows(context) {
  const { discoveredHosts, discoveredCandidates, journeyFamilies } = context;
  const discoveredFamilies = journeyFamilies.filter((item) => item.status !== "Not observed");
  return [
    row(
      "Digital Estate Discovered",
      "Domains / subdomains found",
      discoveredHosts.length ? "Observed" : "Not observed",
      discoveredHosts.length
        ? `The audit evidence identified ${discoveredHosts.length} same-site domains/subdomains in discovery context.`
        : "No same-site discovery domains were available beyond visited journey evidence.",
      joinList(discoveredHosts, 10),
    ),
    row(
      "Digital Estate Discovered",
      "Journey families identified",
      discoveredFamilies.length ? "Observed" : "Not observed",
      discoveredFamilies.length
        ? `Discovery and journey evidence identified ${discoveredFamilies.length} journey families that appear to exist.`
        : "No journey families were identified from discovery or journey evidence.",
      joinList(discoveredFamilies.map((item) => item.family), 10),
    ),
    row(
      "Digital Estate Discovered",
      "Representative URLs identified",
      discoveredCandidates.length ? "Observed" : "Not observed",
      discoveredCandidates.length
        ? `${discoveredCandidates.length} representative URLs were available from site discovery.`
        : "No representative site discovery URLs were available.",
      joinList(discoveredCandidates.map((item) => compactUrl(item.url)), 10),
    ),
  ];
}

function buildJourneyCoverageRows(context) {
  return context.journeyFamilies.map((family) => row(
    "Journey Coverage",
    family.family,
    family.status,
    family.observation,
    joinList(family.evidence, 8),
    family.status === "Discovered only"
      ? `${family.family} evidence was discovered but not represented during the audit. Should ${family.family} be considered in scope?`
      : "",
  ));
}

function buildCoverageGapRows(context) {
  const discoveredOnly = context.journeyFamilies.filter((item) => item.status === "Discovered only");
  const failedSkipped = context.allSteps.filter((step) => ["failed", "skipped"].includes(step.status));
  const rows = [];

  rows.push(row(
    "Coverage Gaps",
    "Discovered-only journey families",
    discoveredOnly.length ? "Discovered only" : "Not observed",
    discoveredOnly.length
      ? `${discoveredOnly.length} discovered journey families were not represented in visited journey steps.`
      : "No discovered-only journey families were identified from available evidence.",
    joinList(discoveredOnly.map((item) => item.family), 10),
  ));

  rows.push(row(
    "Coverage Gaps",
    "Visited domain coverage",
    context.discoveredHosts.length > context.visitedHosts.length ? "Discovered only" : "Validated",
    `The audit visited ${context.visitedHosts.length} of ${context.discoveredHosts.length || context.visitedHosts.length} discovered same-site domains/subdomains.`,
    `Visited: ${joinList(context.visitedHosts, 8)}; discovered: ${joinList(context.discoveredHosts, 8)}`,
  ));

  rows.push(row(
    "Coverage Gaps",
    "Failed or skipped pages",
    failedSkipped.length ? "Observed" : "Not observed",
    failedSkipped.length
      ? `${failedSkipped.length} selected journey steps failed or were skipped.`
      : "No failed or skipped journey steps were observed.",
    joinList(failedSkipped.map((step) => compactUrl(step.url || step.final_url)), 8),
  ));

  return rows;
}

function buildTechnologyTrackingRows(context) {
  return context.technologyGroups.map((group) => row(
    "Technology & Tracking",
    group.group,
    group.items.length ? "Observed" : "Not observed",
    group.observation,
    joinList(group.items, 8),
  ));
}

function buildConsentRows(context) {
  const consent = context.journeyMap.consent || {};
  const preHosts = consent.pre_consent?.network_hosts || [];
  const postHosts = consent.post_consent?.network_hosts || [];
  return [
    row(
      "Consent Summary",
      "Consent interaction",
      consent.status ? "Observed" : "Not observed",
      consent.status
        ? `Consent capture status was ${consent.status}. This is observational evidence only and does not validate legal compliance.`
        : "No consent status was available in the audit output.",
      `Platforms observed: ${joinList(consent.platforms_observed || [], 6)}`,
    ),
    row(
      "Consent Summary",
      "Pre/post consent evidence",
      preHosts.length || postHosts.length ? "Observed" : "Not observed",
      preHosts.length || postHosts.length
        ? "Network evidence was captured for pre-consent and/or post-consent states."
        : "No pre/post consent network host evidence was available.",
      `Pre hosts: ${preHosts.length}; post hosts: ${postHosts.length}`,
    ),
  ];
}

function buildEvidenceLimitationRows(context) {
  const rows = [];
  for (const limit of context.journeyMap.limits || []) {
    rows.push(row(
      "Evidence Limitations",
      limit.code || "Limit",
      "Observed",
      [limit.message, limit.impact].filter(Boolean).join(" "),
      limit.code || "",
    ));
  }

  for (const limit of context.siteDiscovery?.limits || []) {
    rows.push(row(
      "Evidence Limitations",
      limit.code || "Discovery limit",
      "Observed",
      [limit.message, limit.impact].filter(Boolean).join(" "),
      limit.code || "",
    ));
  }

  if (!rows.length) {
    rows.push(row("Evidence Limitations", "Limits", "Not observed", "No explicit audit limits were present in the available evidence.", ""));
  }
  return rows;
}

function buildFollowUpRows(context) {
  const questions = context.followUpQuestions;
  if (!questions.length) {
    return [row("Follow-up Questions", "No deterministic questions", "Not observed", "No deterministic follow-up questions were generated from the available evidence.", "", "")];
  }
  return questions.map((item) => row(
    "Follow-up Questions",
    item.topic,
    "Observed",
    "Follow-up question derived from observed or discovered evidence.",
    item.evidence,
    item.question,
  ));
}

function row(section, topic, status, observation, evidence = "", followUpQuestion = "") {
  return {
    Section: section,
    Topic: topic,
    Status: status,
    Observation: observation,
    Evidence: evidence,
    "Follow-up Question": followUpQuestion,
  };
}

module.exports = {
  buildConsultantSummaryRows,
};
