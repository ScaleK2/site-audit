const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { parseAuditInput } = require("../core/audit-key");
const { ensureDir } = require("../core/file-utils");
const { outputPathsForAudit } = require("../core/output-paths");
const { evaluateScope } = require("../core/scope");
const { isLikelyPageUrl, normaliseUrl } = require("../core/url-utils");
const { discoverLinkEvidence } = require("../journey/discover-links");
const { classifyUrl } = require("./classify-url");
const { SECTION_ORDER, selectRepresentativeUrls } = require("./select-representative-urls");

const DEFAULT_LIMITS = {
  maxCandidateUrls: 500,
  maxRepresentativeUrls: 40,
  maxPerPageType: 3,
  maxSitemapUrls: 200,
};

async function runSiteDiscovery(inputUrl, options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const limits = { ...DEFAULT_LIMITS, ...options };
  const audit = parseAuditInput(inputUrl, { allowSubdomains: true });
  if (!audit) throw new Error(`Invalid URL: ${inputUrl || ""}`);

  const outputPaths = outputPathsForAudit(rootDir, audit.auditKey);
  const discoveryDir = path.join(outputPaths.auditDir, "discovery");
  const urlsTxtPath = path.join(discoveryDir, "urls.txt");
  const siteDiscoveryJsonPath = path.join(discoveryDir, "site-discovery.json");
  ensureDir(discoveryDir);

  const startedAt = new Date().toISOString();
  const sourceState = initialSourceState(audit);
  const rawCandidates = [];
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1200 },
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(options.timeoutMs || 30_000);
    page.setDefaultNavigationTimeout(options.timeoutMs || 30_000);

    await page.goto(audit.homeUrl, { waitUntil: "domcontentloaded" });
    await page
      .waitForLoadState("networkidle", { timeout: options.networkIdleTimeoutMs || 8_000 })
      .catch(() => {});

    const exactHostAudit = { ...audit, allowSubdomains: false };
    const linkEvidence = await discoverLinkEvidence(page, exactHostAudit);
    sourceState.homepage_links = {
      attempted: true,
      success: true,
      count: linkEvidence.discovered_links.length,
    };
    sourceState.raw_link_candidates = {
      attempted: true,
      success: true,
      count: linkEvidence.raw_link_candidates.length,
    };
    sourceState.filtered_same_site_links = {
      attempted: true,
      success: true,
      count: linkEvidence.filtered_out_links.filter(isFilteredSameSite).length,
    };

    rawCandidates.push(
      seedCandidate(audit.homeUrl),
      ...linkEvidence.discovered_links.map((link) => ({ ...link, source: "homepage_links" })),
      ...linkEvidence.raw_link_candidates.map((link) => ({ ...link, source: "raw_link_candidates" })),
      ...linkEvidence.filtered_out_links
        .filter(isFilteredSameSite)
        .map((link) => ({ ...link, source: "filtered_same_site_links" })),
    );

    await context.close();
  } catch (error) {
    sourceState.homepage_links = {
      attempted: true,
      success: false,
      count: 0,
      error: error?.message || String(error),
    };
  } finally {
    await browser.close().catch(() => {});
  }

  const sitemapCandidates = await discoverSitemapCandidates(audit, sourceState, limits);
  rawCandidates.push(...sitemapCandidates);

  const candidateUrls = buildCandidateUrls({
    audit,
    rawCandidates,
    limits,
  });
  const representativeUrls = selectRepresentativeUrls({
    seedUrl: audit.homeUrl,
    candidates: candidateUrls.filter((candidate) => candidate.include_candidate),
    limits,
  });

  const completedAt = new Date().toISOString();
  const siteDiscovery = {
    schema_version: "site-discovery.v1",
    audit: {
      input_url: inputUrl,
      audit_key: audit.auditKey,
      site_host: audit.siteHost,
      seed_host: audit.host,
      started_at: startedAt,
      completed_at: completedAt,
    },
    settings: {
      max_candidate_urls: limits.maxCandidateUrls,
      max_representative_urls: limits.maxRepresentativeUrls,
      max_per_page_type: limits.maxPerPageType,
      include_same_site_subdomains: true,
      include_robots_sitemaps: true,
      recursive_crawl: false,
    },
    sources: sourceState,
    candidate_urls: candidateUrls,
    representative_urls: representativeUrls,
    output: {
      urls_txt_path: relativePath(rootDir, urlsTxtPath),
      site_discovery_json_path: relativePath(rootDir, siteDiscoveryJsonPath),
    },
    limits: [
      {
        code: "REPRESENTATIVE_DISCOVERY_ONLY",
        message: "Discovery selects representative URLs only.",
        impact: "This is not a complete site inventory or recursive crawl.",
      },
    ],
    notes: [],
  };

  fs.writeFileSync(siteDiscoveryJsonPath, `${JSON.stringify(siteDiscovery, null, 2)}\n`);
  fs.writeFileSync(urlsTxtPath, buildUrlsTxt(siteDiscovery));

  return {
    audit,
    discoveryDir,
    urlsTxtPath,
    siteDiscoveryJsonPath,
    siteDiscovery,
  };
}

function buildCandidateUrls({ audit, rawCandidates, limits }) {
  const byUrl = new Map();

  for (const raw of rawCandidates) {
    const normalizedUrl = normaliseUrl(raw.url || raw.href, audit.homeUrl);
    if (!normalizedUrl) continue;

    const scopeEvaluation = evaluateScope(normalizedUrl, { ...audit, allowSubdomains: true });
    const source = raw.source || "unknown";
    const existing = byUrl.get(normalizedUrl);
    if (existing) {
      if (!existing.sources.includes(source)) existing.sources.push(source);
      if (!existing.text && raw.text) existing.text = raw.text;
      continue;
    }

    let url;
    try {
      url = new URL(normalizedUrl);
    } catch {
      continue;
    }

    const includeCandidate = scopeEvaluation.same_site && isLikelyPageUrl(normalizedUrl);
    const candidate = {
      url: normalizedUrl,
      host: scopeEvaluation.host,
      site_host: audit.siteHost,
      sources: [source],
      text: raw.text || "",
      same_site: scopeEvaluation.same_site,
      same_host: scopeEvaluation.same_host,
      is_subdomain: scopeEvaluation.same_site && scopeEvaluation.host !== audit.siteHost && scopeEvaluation.host !== audit.host,
      path_depth: pathDepth(url.pathname),
      normalized_pattern: normalizedPattern(url.pathname),
      include_candidate: includeCandidate,
      reject_reason: includeCandidate ? "" : rejectReason(normalizedUrl, scopeEvaluation),
    };
    candidate.page_type = classifyUrl(candidate);
    byUrl.set(normalizedUrl, candidate);

    if (byUrl.size >= limits.maxCandidateUrls) break;
  }

  return [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
}

async function discoverSitemapCandidates(audit, sourceState, limits) {
  const candidates = [];
  const robotsUrl = new URL("/robots.txt", audit.origin).toString();
  const sitemapUrls = new Set([new URL("/sitemap.xml", audit.origin).toString()]);

  try {
    const robotsText = await fetchText(robotsUrl, limits.fetchTimeoutMs || 8_000);
    const robotsSitemaps = parseRobotsSitemaps(robotsText);
    robotsSitemaps.forEach((url) => sitemapUrls.add(url));
    sourceState.robots_txt = {
      attempted: true,
      success: true,
      url: robotsUrl,
      sitemap_urls_found: robotsSitemaps,
    };
  } catch (error) {
    sourceState.robots_txt = {
      attempted: true,
      success: false,
      url: robotsUrl,
      error: error?.message || String(error),
      sitemap_urls_found: [],
    };
  }

  let sitemapSuccess = false;
  let sitemapError = "";
  for (const sitemapUrl of [...sitemapUrls].sort()) {
    try {
      const sitemapText = await fetchText(sitemapUrl, limits.fetchTimeoutMs || 8_000);
      const urls = parseSitemapUrls(sitemapText).slice(0, limits.maxSitemapUrls);
      for (const url of urls) candidates.push({ url, source: "sitemap_xml" });
      sitemapSuccess = true;
    } catch (error) {
      sitemapError = error?.message || String(error);
    }
  }

  sourceState.sitemap_xml = {
    attempted: true,
    success: sitemapSuccess,
    urls_checked: [...sitemapUrls].sort(),
    count: candidates.length,
    ...(sitemapSuccess ? {} : { error: sitemapError || "not_found" }),
  };

  return candidates;
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseRobotsSitemaps(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*sitemap:\s*(.+?)\s*$/i)?.[1])
    .filter(Boolean);
}

function parseSitemapUrls(text) {
  return [...String(text || "").matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function buildUrlsTxt(siteDiscovery) {
  const lines = [
    "# Generated by Site Audit site discovery",
    `# Seed URL: ${siteDiscovery.audit.input_url}`,
    `# Generated at: ${siteDiscovery.audit.completed_at}`,
    "# Purpose: representative audit URL list, not a full crawl",
    "",
  ];

  const bySection = new Map();
  for (const item of siteDiscovery.representative_urls) {
    const section = item.section || item.page_type || "unknown";
    if (!bySection.has(section)) bySection.set(section, []);
    bySection.get(section).push(item.url);
  }

  for (const section of SECTION_ORDER) {
    const urls = bySection.get(section);
    if (!urls?.length) continue;
    lines.push(`# ${sectionLabel(section)}`);
    for (const url of urls) lines.push(url);
    lines.push("");
  }

  for (const [section, urls] of bySection.entries()) {
    if (SECTION_ORDER.includes(section)) continue;
    lines.push(`# ${sectionLabel(section)}`);
    for (const url of urls) lines.push(url);
    lines.push("");
  }

  return `${lines.join("\n").replace(/\n+$/g, "")}\n`;
}

function sectionLabel(section) {
  return String(section || "unknown")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initialSourceState(audit) {
  return {
    seed: { attempted: true, success: true, url: audit.homeUrl, count: 1 },
    homepage_links: { attempted: false, success: false, count: 0 },
    raw_link_candidates: { attempted: false, success: false, count: 0 },
    filtered_same_site_links: { attempted: false, success: false, count: 0 },
    robots_txt: { attempted: false, success: false, sitemap_urls_found: [] },
    sitemap_xml: { attempted: false, success: false, count: 0 },
  };
}

function seedCandidate(url) {
  return {
    url,
    text: "",
    source: "seed",
  };
}

function isFilteredSameSite(link) {
  return link?.reason === "out_of_scope" && link?.scope_evaluation?.same_site === true;
}

function pathDepth(pathname) {
  return String(pathname || "/").split("/").filter(Boolean).length;
}

function normalizedPattern(pathname) {
  const parts = String(pathname || "/").split("/").filter(Boolean);
  if (!parts.length) return "/";
  return `/${parts.slice(0, 2).join("/")}`;
}

function rejectReason(url, scopeEvaluation) {
  if (!scopeEvaluation.same_site) return "external_domain";
  if (!isLikelyPageUrl(url)) return "static_asset";
  return "unknown";
}

function relativePath(rootDir, filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join(path.posix.sep);
}

module.exports = {
  buildCandidateUrls,
  buildUrlsTxt,
  runSiteDiscovery,
};
