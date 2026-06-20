const { chromium } = require("playwright");
const { parseAuditInput } = require("../core/audit-key");
const {
  ensureJourneyOutputDirs,
  outputPathsForAudit,
} = require("../core/output-paths");
const { writeJson } = require("../core/file-utils");
const { classifyLinks } = require("./classify-links");
const { buildDiscoveryStatus } = require("./discovery-status");
const { capturePageState } = require("./capture-page-state");
const { initialiseConsent } = require("./initialise-consent");
const { inferSiteProfile } = require("./infer-site-profile");
const { createNetworkRecorder } = require("./network-recorder");
const { prioritiseLinks } = require("./prioritise-links");
const { selectJourneyPatterns } = require("./select-journey-patterns");
const { visitSelectedLinks } = require("./visit-selected-links");

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function runJourneyMap(inputUrl, options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const audit = parseAuditInput(inputUrl, options);
  if (!audit) throw new Error(`Invalid URL: ${inputUrl || ""}`);

  const outputPaths = outputPathsForAudit(rootDir, audit.auditKey);
  ensureJourneyOutputDirs(outputPaths);

  const startedAt = new Date().toISOString();
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      userAgent: options.userAgent || DEFAULT_USER_AGENT,
      viewport: { width: 1440, height: 1200 },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(options.timeoutMs || 30_000);
    page.setDefaultNavigationTimeout(options.timeoutMs || 30_000);

    const networkRecorder = createNetworkRecorder(page);
    networkRecorder.reset();

    const response = await page.goto(audit.homeUrl, {
      waitUntil: "domcontentloaded",
    });
    await page
      .waitForLoadState("networkidle", {
        timeout: options.networkIdleTimeoutMs || 8_000,
      })
      .catch(() => {});

    const consent = await initialiseConsent({
      page,
      context,
      networkRecorder,
      options,
    });

    const homepageStep = await capturePageState(page, audit, outputPaths, {
      stepIndex: 1,
      label: "homepage",
      requestedUrl: audit.homeUrl,
      httpStatus: response ? response.status() : null,
    });

    homepageStep.tracking_signals.network_hosts =
      consent.post_consent.network_hosts;

    const siteProfile = inferSiteProfile({ homepageStep });
    const selectedPatterns = selectJourneyPatterns({ siteProfile });
    const classifiedLinks = classifyLinks({
      links: homepageStep.discovered_links,
      homepageStep,
      siteProfile,
      selectedPatterns,
    });
    const selectedLinks = prioritiseLinks({
      classifiedLinks,
      maxLinks: Math.max(0, (options.maxPages || 20) - 1),
    });

    homepageStep.classified_candidate_links = classifiedLinks;
    homepageStep.selected_links = selectedLinks;

    const discoveryStatus = buildDiscoveryStatus({
      audit,
      homepageStep,
      classifiedLinks,
      selectedLinks,
    });

    const selectedSteps = await visitSelectedLinks({
      page,
      audit,
      outputPaths,
      selectedLinks,
      networkRecorder,
      startStepIndex: 2,
      maxPages: options.maxPages || 20,
      options,
    });
    const journeySteps = [homepageStep, ...selectedSteps].slice(
      0,
      options.maxPages || 20,
    );

    networkRecorder.dispose();

    const journeyMap = {
      schema_version: "journey-map.v1",
      audit: {
        input_url: inputUrl,
        audit_key: audit.auditKey,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
        scope_mode: audit.scopeMode,
        scope_path: audit.scopePath,
        max_pages: options.maxPages || 20,
        user_agent: options.userAgent || DEFAULT_USER_AGENT,
        runner: "scripts/journey-map.js",
      },
      site_profile: siteProfile,
      discovery_status: discoveryStatus,
      consent,
      journeys: [
        {
          journey_id: "homepage-discovery",
          label: "Homepage discovery",
          profile: siteProfile.primary_profile,
          sub_profile: siteProfile.sub_profile,
          category:
            selectedPatterns[0]?.category || "research_or_consideration",
          priority: selectedPatterns[0]?.priority || "medium",
          classification: {
            method: "deterministic_profile_and_link_rules",
            confidence: siteProfile.profiles[0]?.confidence || "unknown",
            matched_patterns: selectedPatterns.map((pattern) => pattern.id),
          },
          steps: journeySteps,
        },
      ],
      observations: {
        technologies: [],
        tracking: [],
        consent: [],
        risks: [],
      },
      limits: [
        {
          code: "SELECTED_LINKS_ONLY",
          message:
            "PR 3 visits only selected priority links discovered from the homepage.",
          impact:
            "This is not a recursive crawl or complete end-to-end journey traversal.",
        },
        {
          code: "CONSENT_CAPTURE_IS_OBSERVATIONAL",
          message:
            "Consent capture records observable pre/post accept states only.",
          impact:
            "This does not validate legal compliance or prove full consent architecture correctness.",
        },
      ],
    };

    writeJson(outputPaths.journeyMapJson, journeyMap);

    await context.close();

    return {
      audit,
      outputPaths,
      journeyMap,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = {
  runJourneyMap,
};
