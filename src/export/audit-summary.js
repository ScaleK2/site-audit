const { allSteps, countScreenshots, fieldRow, joinValues } = require("./sheet-builders");

function buildAuditSummaryRows(journeyMap) {
  const steps = allSteps(journeyMap);
  const homepageStep = steps[0] || {};
  const selectedLinks = homepageStep.selected_links || [];

  return [
    fieldRow("Schema Version", journeyMap.schema_version),
    fieldRow("Audit Key", journeyMap.audit?.audit_key),
    fieldRow("Input URL", journeyMap.audit?.input_url),
    fieldRow("Started At", journeyMap.audit?.started_at),
    fieldRow("Completed At", journeyMap.audit?.completed_at),
    fieldRow("Scope Mode", journeyMap.audit?.scope_mode),
    fieldRow("Scope Path", journeyMap.audit?.scope_path),
    fieldRow("Max Pages", journeyMap.audit?.max_pages),
    fieldRow("Runner", journeyMap.audit?.runner),
    fieldRow("Primary Profile", journeyMap.site_profile?.primary_profile),
    fieldRow("Sub Profile", journeyMap.site_profile?.sub_profile),
    fieldRow("Profile Confidence", journeyMap.site_profile?.profiles?.[0]?.confidence),
    fieldRow("Consent Status", journeyMap.consent?.status),
    fieldRow("Consent Platforms", joinValues(journeyMap.consent?.platforms_observed)),
    fieldRow("Discovery Capture Success", journeyMap.discovery_status?.capture_success),
    fieldRow(
      "Discovery Classification Success",
      journeyMap.discovery_status?.classification_success,
    ),
    fieldRow(
      "Discovery Journey Selection Success",
      journeyMap.discovery_status?.journey_selection_success,
    ),
    fieldRow("Journey Count", (journeyMap.journeys || []).length),
    fieldRow("Step Count", steps.length),
    fieldRow("Visited Step Count", steps.filter((step) => step.status === "visited").length),
    fieldRow("Selected Links Count", selectedLinks.length),
    fieldRow("Screenshot Count", countScreenshots(journeyMap)),
    fieldRow("Limits Count", (journeyMap.limits || []).length),
  ];
}

module.exports = {
  buildAuditSummaryRows,
};
