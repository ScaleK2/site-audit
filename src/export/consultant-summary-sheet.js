const { formatEvidenceList, safeCellValue } = require("../interpretation/evidence-utils");

const CONSULTANT_SUMMARY_COLUMNS = [
  "Section",
  "Item",
  "Status",
  "Summary",
  "Evidence",
  "Follow-up Question",
];

function buildConsultantSummaryRows(summary) {
  return [
    sectionHeader("Executive Snapshot"),
    ...executiveSnapshotRows(summary.executive_snapshot),
    sectionHeader("Audit Scope"),
    ...auditScopeRows(summary.audit_scope),
    sectionHeader("Digital Estate Discovered"),
    ...digitalEstateRows(summary.digital_estate),
    sectionHeader("Journey Coverage"),
    ...journeyCoverageRows(summary.journey_coverage),
    sectionHeader("Coverage Gaps"),
    ...coverageGapRows(summary.coverage_gaps),
    sectionHeader("Technology & Tracking"),
    ...technologyRows(summary.technology_tracking),
    sectionHeader("Consent Summary"),
    ...consentRows(summary.consent_summary),
    sectionHeader("Evidence Limitations"),
    ...limitationRows(summary.evidence_limitations),
    sectionHeader("Follow-up Questions"),
    ...questionRows(summary.follow_up_questions),
  ];
}

function executiveSnapshotRows(snapshot = {}) {
  return [
    row("Executive Snapshot", "Coverage", snapshot.coverage, snapshot.coverage_summary, ""),
    row("Executive Snapshot", "Primary Profile", "Observed", snapshot.primary_profile, ""),
    row("Executive Snapshot", "Sub-profile", snapshot.sub_profile ? "Observed" : "Not observed", snapshot.sub_profile || "No sub-profile identified.", ""),
    row("Executive Snapshot", "Input URL", "Observed", snapshot.input_url, snapshot.input_url),
    row("Executive Snapshot", "Audit Type", "Observed", snapshot.audit_type, ""),
    row("Executive Snapshot", "Journey Families Validated", "Observed", `${snapshot.journey_families_validated} / ${snapshot.journey_families_discovered} journey families validated.`, ""),
    row("Executive Snapshot", "Domains Visited", "Observed", `${snapshot.domains_visited} / ${snapshot.domains_discovered} discovered domains visited.`, ""),
    row("Executive Snapshot", "Discovery Available", snapshot.discovery_available ? "Observed" : "Not observed", snapshot.discovery_available ? "Site discovery evidence was available." : "Site discovery evidence was not available.", ""),
    row("Executive Snapshot", "Evidence Sources", "Observed", formatEvidenceList(snapshot.evidence_sources), ""),
  ];
}

function auditScopeRows(scope = {}) {
  return [
    row("Audit Scope", "Seed URL", "Observed", scope.seed_url, scope.seed_url),
    row("Audit Scope", "Audit Key", "Observed", scope.audit_key, scope.audit_key),
    row("Audit Scope", "Audit Date", scope.audit_date ? "Observed" : "Not observed", scope.audit_date || "No audit completion date was present.", ""),
    row("Audit Scope", "Representative Discovery", scope.representative_discovery ? "Observed" : "Not observed", scope.representative_discovery ? "Representative discovery evidence was available." : "Representative discovery evidence was not available.", ""),
    row("Audit Scope", "Same-site Subdomains Included", scope.same_site_subdomains_included ? "Observed" : "Not observed", scope.same_site_subdomains_included ? "Same-site subdomains were allowed for this audit." : "Same-site subdomains were not allowed for this audit.", ""),
    row("Audit Scope", "Candidate Pages", "Observed", `${scope.candidate_pages || 0} candidate pages were available from discovery context.`, ""),
    row("Audit Scope", "Visited Pages", "Observed", `${scope.visited_pages || 0} pages were visited successfully.`, ""),
    row("Audit Scope", "Maximum Pages", scope.maximum_pages ? "Observed" : "Not observed", scope.maximum_pages || "No maximum page setting was recorded.", ""),
    row("Audit Scope", "Site Discovery Available", scope.site_discovery_available ? "Observed" : "Not observed", scope.site_discovery_available ? "site-discovery.json was available." : "site-discovery.json was not available.", ""),
  ];
}

function digitalEstateRows(estate = {}) {
  return [
    row("Digital Estate Discovered", "Domains", estate.domains_discovered?.length ? "Observed" : "Not observed", `${estate.domains_discovered?.length || 0} same-site domains/subdomains were discovered.`, estate.domains_discovered),
    row("Digital Estate Discovered", "Representative Journey Families", estate.journey_families_discovered?.length ? "Observed" : "Not observed", `${estate.journey_families_discovered?.length || 0} representative journey families were identified.`, estate.journey_families_discovered),
    row("Digital Estate Discovered", "Representative Pages", estate.representative_pages_discovered?.length ? "Observed" : "Not observed", `${estate.representative_pages_discovered?.length || 0} representative pages were identified.`, (estate.representative_pages_discovered || []).map((item) => item.url || item.label)),
  ];
}

function journeyCoverageRows(items = []) {
  return items.map((item) => row(
    "Journey Coverage",
    item.journey_family,
    item.status,
    item.journey_observed,
    item.evidence,
    item.follow_up_question,
  ));
}

function coverageGapRows(items = []) {
  if (!items.length) {
    return [row("Coverage Gaps", "No discovered-only gaps", "Not observed", "No discovered-only coverage gaps were identified from available evidence.", "")];
  }
  return items.map((item) => row(
    "Coverage Gaps",
    item.area,
    item.status,
    item.context,
    item.evidence,
    item.follow_up_question,
  ));
}

function technologyRows(items = []) {
  return items.map((item) => row(
    "Technology & Tracking",
    item.category,
    item.observed_evidence?.length ? "Observed" : "Not observed",
    item.notes,
    item.observed_evidence,
  ));
}

function consentRows(consent = {}) {
  return [
    row("Consent Summary", "Consent Interaction", consent.interaction_observed ? "Observed" : "Not observed", `Consent status: ${consent.status || "not_observed"}. ${consent.note || ""}`, ""),
    row("Consent Summary", "CMP Detected", consent.cmp_detected ? "Observed" : "Not observed", consent.cmp_detected ? "CMP platform evidence was observed." : "No CMP platform evidence was observed.", consent.platforms_observed),
    row("Consent Summary", "Pre-consent Evidence", consent.pre_consent_evidence ? "Observed" : "Not observed", consent.pre_consent_evidence ? "Pre-consent network or script evidence was captured." : "No pre-consent network or script evidence was available.", ""),
    row("Consent Summary", "Post-consent Evidence", consent.post_consent_evidence ? "Observed" : "Not observed", consent.post_consent_evidence ? "Post-consent network or script evidence was captured." : "No post-consent network or script evidence was available.", ""),
    row("Consent Summary", "Network Evidence", consent.network_evidence ? "Observed" : "Not observed", consent.network_evidence ? "Consent-related network evidence was available." : "No consent-related network evidence was available.", ""),
  ];
}

function limitationRows(items = []) {
  if (!items.length) {
    return [row("Evidence Limitations", "No explicit limits", "Not observed", "No explicit audit limits were present in the available evidence.", "")];
  }
  return items.map((item) => row(
    "Evidence Limitations",
    item.topic,
    "Observed",
    item.context,
    item.evidence,
  ));
}

function questionRows(items = []) {
  if (!items.length) {
    return [row("Follow-up Questions", "No deterministic questions", "Not observed", "No deterministic follow-up questions were generated from available evidence.", "")];
  }
  return items.map((item) => row(
    "Follow-up Questions",
    item.topic,
    "Observed",
    item.question,
    item.evidence,
    item.question,
  ));
}

function sectionHeader(section) {
  return row(section, "", "", "", "", "");
}

function row(section, item, status, summary, evidence = "", followUpQuestion = "") {
  return {
    Section: safeCellValue(section),
    Item: safeCellValue(item),
    Status: safeCellValue(status),
    Summary: safeCellValue(summary),
    Evidence: formatEvidence(evidence),
    "Follow-up Question": safeCellValue(followUpQuestion),
  };
}

function formatEvidence(evidence) {
  if (Array.isArray(evidence)) return formatEvidenceList(evidence, { limit: 6 });
  return safeCellValue(evidence);
}

function formatConsultantSummarySheet(worksheet, rows) {
  worksheet["!cols"] = [
    { wch: 24 },
    { wch: 32 },
    { wch: 18 },
    { wch: 62 },
    { wch: 56 },
    { wch: 62 },
  ];
  worksheet["!rows"] = rows.map((row) => ({ hpt: isSectionHeader(row) ? 24 : 48 }));
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };

  for (let index = 0; index <= rows.length; index += 1) {
    for (const column of ["A", "B", "C", "D", "E", "F"]) {
      const cell = worksheet[`${column}${index + 1}`];
      if (!cell) continue;
      cell.s = cell.s || {};
      cell.s.alignment = { wrapText: true, vertical: "top" };
      if (index === 0 || isSectionHeader(rows[index - 1])) {
        cell.s.font = { bold: true };
      }
    }
  }
}

function isSectionHeader(row) {
  return Boolean(row?.Section && !row.Item && !row.Status && !row.Summary && !row.Evidence && !row["Follow-up Question"]);
}

module.exports = {
  CONSULTANT_SUMMARY_COLUMNS,
  buildConsultantSummaryRows,
  formatConsultantSummarySheet,
};
