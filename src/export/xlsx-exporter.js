const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { buildConsultantSummary } = require("../interpretation/consultant-summary");
const {
  buildConsultantSummaryRows,
  formatConsultantSummarySheet,
} = require("./consultant-summary-sheet");
const { buildAuditSummaryRows } = require("./audit-summary");
const {
  SHEET_DEFINITIONS,
  buildAuditEvidenceCatalogueRows,
  buildConsentReviewRows,
  buildDiscoveryStatusRows,
  buildJourneyStepRows,
  buildLimitNoteRows,
  buildScreenshotRegistryRows,
  buildSelectedLinkRows,
  buildSiteProfileRows,
  buildTechnologyNetworkRows,
  rowsToSheet,
} = require("./sheet-builders");

function exportAuditWorkbook(journeyMapPath, options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const resolvedInputPath = path.resolve(rootDir, journeyMapPath);
  if (!fs.existsSync(resolvedInputPath)) {
    throw new Error(`Journey map JSON not found: ${journeyMapPath}`);
  }

  const journeyMap = readJourneyMap(resolvedInputPath);
  const siteDiscovery = readSiteDiscoveryForJourneyMap(resolvedInputPath);
  const outputDir = outputDirForJourneyMap(resolvedInputPath, journeyMap);
  fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, options.fileName || "audit-export.xlsx");
  const workbook = XLSX.utils.book_new();
  const consultantSummary = buildConsultantSummary(journeyMap, siteDiscovery);
  const sheets = buildWorkbookSheets(journeyMap, siteDiscovery, consultantSummary);

  for (const sheet of sheets) {
    const worksheet = rowsToSheet(sheet.rows, sheet.columns);
    if (typeof sheet.format === "function") sheet.format(worksheet, sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }

  XLSX.writeFile(workbook, outputPath);

  return {
    rootDir,
    inputPath: resolvedInputPath,
    outputPath,
    sheetNames: workbook.SheetNames,
    rowCounts: Object.fromEntries(
      sheets.map((sheet) => [sheet.name, sheet.rows.length]),
    ),
  };
}

function readJourneyMap(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read journey map JSON: ${error?.message || error}`);
  }
}

function readSiteDiscoveryForJourneyMap(inputPath) {
  const journeysDir = path.dirname(inputPath);
  const auditDir = path.basename(journeysDir) === "journeys"
    ? path.dirname(journeysDir)
    : path.dirname(inputPath);
  const discoveryPath = path.join(auditDir, "discovery", "site-discovery.json");

  if (!fs.existsSync(discoveryPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(discoveryPath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read site discovery JSON: ${error?.message || error}`);
  }
}

function outputDirForJourneyMap(inputPath, journeyMap) {
  const auditKey = journeyMap?.audit?.audit_key;
  const journeysDir = path.dirname(inputPath);
  const auditDir = path.basename(journeysDir) === "journeys"
    ? path.dirname(journeysDir)
    : path.dirname(inputPath);

  if (auditKey && path.basename(auditDir) !== auditKey) {
    return path.join(path.dirname(auditDir), auditKey, "exports");
  }

  return path.join(auditDir, "exports");
}

function buildWorkbookSheets(journeyMap, siteDiscovery = null, consultantSummary = null) {
  const summary = consultantSummary || buildConsultantSummary(journeyMap, siteDiscovery);
  return [
    sheet("Consultant Summary", buildConsultantSummaryRows(summary), formatConsultantSummarySheet),
    sheet("Audit Summary", buildAuditSummaryRows(journeyMap)),
    sheet("Site Profile", buildSiteProfileRows(journeyMap)),
    sheet("Discovery Status", buildDiscoveryStatusRows(journeyMap)),
    sheet("Journey Steps", buildJourneyStepRows(journeyMap)),
    sheet("Selected Links", buildSelectedLinkRows(journeyMap)),
    sheet("Consent Review", buildConsentReviewRows(journeyMap)),
    sheet("Technology - Network Evidence", buildTechnologyNetworkRows(journeyMap)),
    sheet("Screenshot Registry", buildScreenshotRegistryRows(journeyMap)),
    sheet("Audit Evidence Catalogue", buildAuditEvidenceCatalogueRows(journeyMap)),
    sheet("Limits - Notes", buildLimitNoteRows(journeyMap)),
  ];
}

function sheet(name, rows, format) {
  return {
    name,
    rows,
    columns: SHEET_DEFINITIONS[name] || [],
    format,
  };
}

module.exports = {
  buildWorkbookSheets,
  exportAuditWorkbook,
};
