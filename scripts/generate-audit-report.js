#!/usr/bin/env node

const path = require("path");
const { buildReportModel } = require("../src/report/report-model");
async function main() {
  const input = process.argv[2];
  if (!input || input === "--help" || input === "-h") {
    printUsage();
    process.exitCode = input ? 0 : 1;
    return;
  }

  const rootDir = path.resolve(__dirname, "..");
  const model = buildReportModel(input, { rootDir });
  const { generateDocxReport } = require("../src/report/docx-report-generator");
  const result = await generateDocxReport(model);

  console.log(`site-audit-report.docx path: ${relativePath(rootDir, result.outputPath)}`);
  console.log(`Screenshots included: ${result.screenshotCount}`);
}

function printUsage() {
  console.log("Usage:");
  console.log("  node scripts/generate-audit-report.js data/{audit-key}/journeys/journey-map.json");
  console.log("  node scripts/generate-audit-report.js {audit-key}");
}

function relativePath(rootDir, filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join(path.posix.sep);
}

main().catch((error) => {
  console.error(`Report generation failed: ${error?.message || error}`);
  process.exitCode = 1;
});
