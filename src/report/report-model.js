const fs = require("fs");
const path = require("path");
const { buildConsultantSummary } = require("../interpretation/consultant-summary");
const {
  allSteps,
  compactUrl,
  formatEvidenceList,
  hostForUrl,
  successfulStepUrls,
  unique,
  visitedSteps,
} = require("../interpretation/evidence-utils");

const DEFAULT_REPORT_FILE = "site-audit-report.docx";

function buildReportModel(input, options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const paths = resolveReportPaths(input, { rootDir });
  const journeyMap = readJson(paths.journeyMapPath, "journey map");
  const siteDiscovery = fs.existsSync(paths.siteDiscoveryPath)
    ? readJson(paths.siteDiscoveryPath, "site discovery")
    : null;
  const consultantSummary = buildConsultantSummary(journeyMap, siteDiscovery);
  const screenshots = selectRepresentativeScreenshots(journeyMap, paths.auditDir, options);
  const domainsVisited = unique(successfulStepUrls(journeyMap).map(hostForUrl).filter(Boolean));
  const domainsDiscovered = consultantSummary.digital_estate.domains_discovered || [];

  return {
    metadata: {
      report_type: "Site Audit Report",
      audit_key: journeyMap.audit?.audit_key || paths.auditKey,
      input_url: journeyMap.audit?.input_url || "",
      audit_date: journeyMap.audit?.completed_at || "",
      client_name: options.clientName || "",
      output_path: paths.outputPath,
      evidence_paths: {
        journey_map: relativePath(rootDir, paths.journeyMapPath),
        site_discovery: fs.existsSync(paths.siteDiscoveryPath) ? relativePath(rootDir, paths.siteDiscoveryPath) : "",
        audit_workbook: fs.existsSync(paths.workbookPath) ? relativePath(rootDir, paths.workbookPath) : "",
      },
    },
    cover_page: {
      title: "Site Audit Report",
      subtitle: "Journey-led external audit",
      client_name: options.clientName || "",
      site: journeyMap.audit?.input_url || journeyMap.audit?.site_host || paths.auditKey,
      audit_date: formatDate(journeyMap.audit?.completed_at),
      prepared_by: "Site Audit",
    },
    executive_summary: buildExecutiveSummary(consultantSummary),
    website_overview: {
      input_url: journeyMap.audit?.input_url || "",
      audit_key: journeyMap.audit?.audit_key || paths.auditKey,
      site_host: journeyMap.audit?.site_host || "",
      primary_profile: consultantSummary.executive_snapshot.primary_profile,
      sub_profile: consultantSummary.executive_snapshot.sub_profile,
      same_site_subdomains_included: Boolean(journeyMap.audit?.allow_subdomains),
      max_pages: journeyMap.audit?.max_pages || "",
      visited_pages: consultantSummary.audit_scope.visited_pages || 0,
      candidate_pages: consultantSummary.audit_scope.candidate_pages || 0,
      discovery_available: consultantSummary.audit_scope.site_discovery_available,
    },
    digital_estate: {
      domains_discovered: domainsDiscovered,
      domains_visited: domainsVisited,
      journey_families_discovered: consultantSummary.digital_estate.journey_families_discovered || [],
      representative_pages: consultantSummary.digital_estate.representative_pages_discovered || [],
    },
    representative_journeys: buildRepresentativeJourneys(consultantSummary, screenshots),
    measurement_opportunities: buildMeasurementOpportunities(consultantSummary, screenshots),
    technology_review: consultantSummary.technology_tracking,
    consent_review: consultantSummary.consent_summary,
    evidence_appendix: buildEvidenceAppendix(journeyMap, paths, screenshots),
    paths,
  };
}

function resolveReportPaths(input, options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const value = String(input || "").trim();
  if (!value) throw new Error("Provide an audit key or journey-map.json path.");

  const journeyMapPath = value.endsWith(".json")
    ? path.resolve(rootDir, value)
    : path.join(rootDir, "data", value, "journeys", "journey-map.json");

  if (!fs.existsSync(journeyMapPath)) {
    throw new Error(`Journey map JSON not found: ${journeyMapPath}`);
  }

  const journeysDir = path.dirname(journeyMapPath);
  const auditDir = path.basename(journeysDir) === "journeys"
    ? path.dirname(journeysDir)
    : path.dirname(journeyMapPath);
  const auditKey = path.basename(auditDir);
  const reportDir = path.join(auditDir, "reports");

  return {
    rootDir,
    auditDir,
    auditKey,
    journeyMapPath,
    siteDiscoveryPath: path.join(auditDir, "discovery", "site-discovery.json"),
    workbookPath: path.join(auditDir, "exports", "audit-export.xlsx"),
    screenshotsDir: path.join(auditDir, "journeys", "screenshots"),
    reportDir,
    outputPath: path.join(reportDir, DEFAULT_REPORT_FILE),
  };
}

function buildExecutiveSummary(summary) {
  const snapshot = summary.executive_snapshot;
  return {
    coverage_label: snapshot.coverage,
    primary_profile: snapshot.primary_profile,
    sub_profile: snapshot.sub_profile,
    evidence_sources: snapshot.evidence_sources,
    summary_points: [
      `Observed evidence indicates a ${snapshot.primary_profile || "site"} profile${snapshot.sub_profile ? ` (${snapshot.sub_profile})` : ""}.`,
      `The audit validated ${snapshot.journey_families_validated} of ${snapshot.journey_families_discovered} discovered journey families.`,
      `The audit visited ${snapshot.domains_visited} of ${snapshot.domains_discovered} discovered same-site domains.`,
      `Coverage is ${snapshot.coverage}. ${snapshot.coverage_summary}`,
    ],
  };
}

function buildRepresentativeJourneys(summary, screenshots) {
  return (summary.journey_coverage || [])
    .filter((journey) => journey.status === "Validated" || journey.status === "Discovered only")
    .slice(0, 10)
    .map((journey) => ({
      journey_family: journey.journey_family,
      status: journey.status,
      narrative: journey.journey_observed,
      evidence: journey.evidence || [],
      follow_up_question: journey.follow_up_question || "",
      screenshots: screenshots.filter((screenshot) => matchesJourneyScreenshot(screenshot, journey)).slice(0, 1),
    }));
}

function buildMeasurementOpportunities(summary, screenshots) {
  const opportunities = [];
  for (const journey of summary.journey_coverage || []) {
    if (journey.status !== "Validated") continue;
    opportunities.push({
      evidence_observed: `${journey.journey_family} journey evidence was represented in visited pages.`,
      observation: `Observed journey evidence may indicate a measurable ${journey.journey_family} path across the audited site experience.`,
      possible_business_impact: "May indicate an opportunity to validate visibility of user movement between discovery, consideration, and action-oriented pages.",
      validation_required: "Validation required in analytics, tag management, CRM, or platform data before drawing performance conclusions.",
      relevant_evidence: journey.evidence || [],
      screenshot: screenshots.find((screenshot) => matchesJourneyScreenshot(screenshot, journey)) || null,
    });
  }
  return opportunities.slice(0, 8);
}

function buildEvidenceAppendix(journeyMap, paths, screenshots) {
  const steps = allSteps(journeyMap);
  return {
    journey_map_path: relativePath(paths.rootDir, paths.journeyMapPath),
    site_discovery_path: fs.existsSync(paths.siteDiscoveryPath) ? relativePath(paths.rootDir, paths.siteDiscoveryPath) : "Not available",
    workbook_path: fs.existsSync(paths.workbookPath) ? relativePath(paths.rootDir, paths.workbookPath) : "Not available",
    screenshots: screenshots.map((screenshot) => ({
      step_index: screenshot.step_index,
      title: screenshot.title,
      url: screenshot.url,
      path: relativePath(paths.rootDir, screenshot.path),
    })),
    visited_steps: steps.filter((step) => step.status === "visited").length,
    failed_steps: steps.filter((step) => step.status === "failed").length,
    skipped_steps: steps.filter((step) => step.status === "skipped").length,
  };
}

function selectRepresentativeScreenshots(journeyMap, auditDir, options = {}) {
  const maxScreenshots = options.maxScreenshots || 8;
  const selected = [];
  const steps = visitedSteps(journeyMap).filter((step) => step.screenshot);

  for (const step of steps) {
    if (step.step_index === 1) pushScreenshot(selected, step, auditDir);
  }

  for (const step of steps) {
    if (selected.length >= maxScreenshots) break;
    pushScreenshot(selected, step, auditDir);
  }

  return selected.slice(0, maxScreenshots);
}

function pushScreenshot(selected, step, auditDir) {
  const screenshotPath = resolveScreenshotPath(step.screenshot, auditDir);
  if (!screenshotPath || !fs.existsSync(screenshotPath)) return;
  if (selected.some((item) => item.path === screenshotPath)) return;
  selected.push({
    step_index: step.step_index,
    title: step.title || step.source_selected_link?.text || `Step ${step.step_index}`,
    url: step.final_url || step.url,
    path: screenshotPath,
    caption: `Step ${step.step_index}: ${step.title || step.final_url || step.url}`,
  });
}

function resolveScreenshotPath(screenshot, auditDir) {
  if (!screenshot) return "";
  if (path.isAbsolute(screenshot)) return screenshot;
  const direct = path.resolve(auditDir, screenshot);
  if (fs.existsSync(direct)) return direct;
  return path.resolve(auditDir, "journeys", screenshot);
}

function matchesJourneyScreenshot(screenshot, journey) {
  const haystack = [screenshot.title, screenshot.url].filter(Boolean).join(" ").toLowerCase();
  const family = String(journey.journey_family || "").toLowerCase();
  return family.split(/\s+|\//).filter(Boolean).some((term) => haystack.includes(term));
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read ${label}: ${error?.message || error}`);
  }
}

function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function relativePath(rootDir, filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join(path.posix.sep);
}

module.exports = {
  buildReportModel,
  formatEvidenceList,
  resolveReportPaths,
};
