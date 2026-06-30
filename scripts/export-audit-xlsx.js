#!/usr/bin/env node

const path = require("path");
const fs = require("fs");
const { exportAuditWorkbook } = require("../src/export/xlsx-exporter");

async function main() {
  const inputPath = firstPositionalArg(process.argv.slice(2));

  if (!inputPath) {
    console.error(
      "Usage: node scripts/export-audit-xlsx.js <path-to-journey-map.json>",
    );
    process.exitCode = 1;
    return;
  }

  validateInputPath(inputPath);

  const result = exportAuditWorkbook(inputPath, {
    rootDir: path.resolve(__dirname, ".."),
  });

  console.log(`Audit workbook written: ${path.relative(result.rootDir, result.outputPath)}`);
  console.log(`Sheets written: ${result.sheetNames.length}`);
  console.log(`Sheet names: ${result.sheetNames.join(", ")}`);
}

function firstPositionalArg(args) {
  for (const arg of args) {
    if (!arg.startsWith("--")) return arg;
  }
  return null;
}

function validateInputPath(inputPath) {
  const rootDir = path.resolve(__dirname, "..");
  const resolvedInputPath = path.resolve(rootDir, inputPath);
  if (
    fs.existsSync(resolvedInputPath) &&
    fs.statSync(resolvedInputPath).isDirectory()
  ) {
    throw new Error(
      `Expected a journey-map.json file, but received a directory: ${inputPath}`,
    );
  }
}

main().catch((error) => {
  console.error(`Audit export failed: ${error?.message || error}`);
  process.exitCode = 1;
});
