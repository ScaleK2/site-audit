const fs = require("fs");
const path = require("path");
const { parseAuditInput } = require("../core/audit-key");
const { outputPathsForAudit } = require("../core/output-paths");
const { runJourneyMap } = require("../journey/journey-runner");
const { exportAuditWorkbook } = require("../export/xlsx-exporter");

const BATCH_MODES = {
  default: {
    label: "Default",
    allowSubdomains: false,
    description: "Existing Journey Mapper behaviour with exact-host scope.",
  },
  "specific-urls": {
    label: "Specific URLs",
    allowSubdomains: false,
    description:
      "Use each URL as a start URL with exact-host scope and no subdomain expansion.",
  },
  "all-subdomains": {
    label: "All subdomains",
    allowSubdomains: true,
    description:
      "Existing behaviour plus same-site subdomain support; unrelated external domains remain out of scope.",
  },
  "full-journey": {
    label: "Full journey",
    allowSubdomains: true,
    description:
      "Specific start URLs plus same-site subdomain support and current selected-link visiting only.",
  },
};

async function runBatch(urlsFilePath, options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const resolvedUrlsFilePath = path.resolve(rootDir, urlsFilePath);
  const urls = readUrlsFile(resolvedUrlsFilePath);
  const mode = resolveBatchMode(options.mode);
  const startedAt = new Date();
  const timestamp = timestampForPath(startedAt);
  const summaryDir = path.join(rootDir, "data", "batch-runs", timestamp);
  const summaryPath = path.join(summaryDir, "batch-summary.json");
  const dependencies = {
    runJourneyMap: options.runJourneyMap || runJourneyMap,
    exportAuditWorkbook: options.exportAuditWorkbook || exportAuditWorkbook,
  };
  const results = [];

  fs.mkdirSync(summaryDir, { recursive: true });

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    options.onProgress?.({
      event: "start",
      index: index + 1,
      total: urls.length,
      url,
      mode: mode.name,
    });

    const result = await runOneUrl({
      url,
      rootDir,
      journeyOptions: options.journeyOptions || {},
      mode,
      dependencies,
    });
    results.push(result);

    options.onProgress?.({
      event: "finish",
      index: index + 1,
      total: urls.length,
      url,
      mode: mode.name,
      result,
    });
  }

  const completedAt = new Date();
  const summary = {
    started_at: startedAt.toISOString(),
    completed_at: completedAt.toISOString(),
    mode: mode.name,
    allow_subdomains: mode.allowSubdomains,
    total_urls: urls.length,
    success_count: results.filter((result) => result.status === "success").length,
    failure_count: results.filter((result) => result.status === "failed").length,
    skipped_existing_count: results.filter(
      (result) => result.status === "skipped_existing",
    ).length,
    results,
  };

  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  return {
    mode,
    summary,
    summaryDir,
    summaryPath,
  };
}

async function runOneUrl({ url, rootDir, journeyOptions, mode, dependencies }) {
  const resolvedJourneyOptions = journeyOptionsForMode(journeyOptions, mode);
  const audit = parseAuditInput(url, resolvedJourneyOptions) || {};
  const outputPaths = audit.auditKey
    ? outputPathsForAudit(rootDir, audit.auditKey)
    : null;
  const baseResult = {
    url,
    status: "failed",
    audit_key: audit.auditKey || "",
    journey_map_path: outputPaths
      ? relativePath(rootDir, outputPaths.journeyMapJson)
      : "",
    excel_export_path: outputPaths
      ? relativePath(rootDir, expectedExcelExportPath(outputPaths.auditDir))
      : "",
  };

  if (outputPaths && fs.existsSync(outputPaths.auditDir)) {
    return {
      ...baseResult,
      status: "skipped_existing",
      error: "",
    };
  }

  try {
    const journeyResult = await dependencies.runJourneyMap(url, {
      ...resolvedJourneyOptions,
      rootDir,
    });
    const journeyMapPath = journeyResult.outputPaths.journeyMapJson;
    const exportResult = dependencies.exportAuditWorkbook(journeyMapPath, {
      rootDir,
    });

    return {
      ...baseResult,
      status: "success",
      audit_key: journeyResult.audit.auditKey || baseResult.audit_key,
      journey_map_path: relativePath(rootDir, journeyMapPath),
      excel_export_path: relativePath(rootDir, exportResult.outputPath),
    };
  } catch (error) {
    return {
      ...baseResult,
      error: error?.message || String(error),
    };
  }
}

function readUrlsFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`URLs file not found: ${filePath}`);
  }

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function resolveBatchMode(modeName = "default") {
  const normalized = String(modeName || "default").toLowerCase();
  const config = BATCH_MODES[normalized];
  if (!config) {
    throw new Error(
      `Unsupported batch mode: ${modeName}. Supported modes: ${Object.keys(
        BATCH_MODES,
      ).join(", ")}`,
    );
  }
  return { name: normalized, ...config };
}

function journeyOptionsForMode(journeyOptions = {}, mode) {
  return {
    ...journeyOptions,
    allowSubdomains: Boolean(mode?.allowSubdomains),
  };
}

function expectedExcelExportPath(auditDir) {
  return path.join(auditDir, "exports", "audit-export.xlsx");
}

function timestampForPath(date) {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[-:]/g, "")
    .replace("T", "T");
}

function relativePath(rootDir, filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join(path.posix.sep);
}

module.exports = {
  BATCH_MODES,
  expectedExcelExportPath,
  journeyOptionsForMode,
  readUrlsFile,
  resolveBatchMode,
  runBatch,
  runOneUrl,
  timestampForPath,
};
