const { chromium } = require("playwright");
const { parseAuditInput } = require("../core/audit-key");
const {
  ensureJourneyOutputDirs,
  outputPathsForAudit,
} = require("../core/output-paths");
const { writeJson } = require("../core/file-utils");
const { capturePageState } = require("./capture-page-state");

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
  const networkUrls = [];

  try {
    const context = await browser.newContext({
      userAgent: options.userAgent || DEFAULT_USER_AGENT,
      viewport: { width: 1440, height: 1200 },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(options.timeoutMs || 30_000);
    page.setDefaultNavigationTimeout(options.timeoutMs || 30_000);

    page.on("request", (request) => {
      networkUrls.push(request.url());
    });

    const response = await page.goto(audit.homeUrl, {
      waitUntil: "domcontentloaded",
    });
    await page
      .waitForLoadState("networkidle", {
        timeout: options.networkIdleTimeoutMs || 8_000,
      })
      .catch(() => {});

    const homepageStep = await capturePageState(page, audit, outputPaths, {
      stepIndex: 1,
      label: "homepage",
      requestedUrl: audit.homeUrl,
      httpStatus: response ? response.status() : null,
    });

    homepageStep.tracking_signals.network_hosts = uniqueHosts(networkUrls);

    const selectedLinks = homepageStep.discovered_links.slice(
      0,
      Math.max(0, (options.maxPages || 20) - 1),
    );
    homepageStep.selected_links = selectedLinks;

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
      site_profile: {
        primary_profile: "unknown",
        profiles: [
          {
            profile: "unknown",
            confidence: "unknown",
            signals: ["profile_inference_not_implemented_in_foundation_pr"],
          },
        ],
      },
      journeys: [
        {
          journey_id: "homepage-discovery",
          label: "Homepage discovery",
          profile: "unknown",
          category: "research_or_consideration",
          priority: "high",
          classification: {
            method: "foundation_homepage_capture_only",
            confidence: "unknown",
            matched_patterns: [],
          },
          steps: [homepageStep],
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
          code: "PROFILE_INFERENCE_NOT_IMPLEMENTED",
          message:
            "Full site profile inference is intentionally excluded from the Journey Mapper Foundation PR.",
          impact:
            "Only homepage discovery and candidate internal links are captured.",
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

function uniqueHosts(urls) {
  const hosts = [];
  const seen = new Set();
  for (const raw of urls) {
    try {
      const host = new URL(raw).hostname.toLowerCase();
      if (!seen.has(host)) {
        seen.add(host);
        hosts.push(host);
      }
    } catch {}
  }
  return hosts.sort();
}

module.exports = {
  runJourneyMap,
};
