const fs = require("fs");
const path = require("path");
const { parseAuditInput } = require("../core/audit-key");
const { runJourneyMap } = require("../journey/journey-runner");
const { exportAuditWorkbook } = require("../export/xlsx-exporter");

async function runBatch(urlsFilePath, options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const resolvedUrlsFilePath = path.resolve(rootDir, urlsFilePath);
  const urls = readUrlsFile(resolvedUrlsFilePath);
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

  for (const url of urls) {
    results.push(
      await runOneUrl({
        url,
        rootDir,
        journeyOptions: options.journeyOptions || {},
        dependencies,
      }),
    );
  }

  const completedAt = new Date();
  const summary = {
    started_at: startedAt.toISOString(),
    completed_at: completedAt.toISOString(),
    total_urls: urls.length,
    success_count: results.filter((result) => result.status === "success").length,
    failure_count: results.filter((result) => result.status === "failed").length,
    results,
  };

  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);

  return {
    summary,
    summaryDir,
    summaryPath,
  };
}

async function runOneUrl({ url, rootDir, journeyOptions, dependencies }) {
  const audit = parseAuditInput(url, journeyOptions) || {};
  const baseResult = {
    url,
    status: "failed",
    audit_key: audit.auditKey || "",
    journey_map_path: "",
    excel_export_path: "",
  };

  try {
    const journeyResult = await dependencies.runJourneyMap(url, {
      ...journeyOptions,
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
  readUrlsFile,
  runBatch,
  runOneUrl,
  timestampForPath,
};
