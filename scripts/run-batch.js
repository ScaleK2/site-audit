#!/usr/bin/env node

const path = require("path");
const { getFlagValue, parseJourneyMapOptions } = require("../src/core/cli-options");
const { BATCH_MODES, resolveBatchMode, runBatch } = require("../src/batch/batch-runner");

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const urlsFile = firstPositionalArg(args);
  if (!urlsFile) {
    console.error(
      "Usage: node scripts/run-batch.js <urls.txt> [--mode=default|all-subdomains|specific-urls|full-journey] [Journey Mapper options]",
    );
    process.exitCode = 1;
    return;
  }

  const rootDir = path.resolve(__dirname, "..");
  const mode = resolveBatchMode(getFlagValue(args, "--mode") || "default");
  const journeyOptions = {
    ...parseJourneyMapOptions(args),
    rootDir,
  };

  console.log(`Batch mode: ${mode.name}`);
  console.log(`URL file: ${urlsFile}`);
  console.log(`Max pages: ${journeyOptions.maxPages}`);
  console.log(`Allow subdomains: ${mode.allowSubdomains ? "yes" : "no"}`);

  const result = await runBatch(urlsFile, {
    rootDir,
    mode: mode.name,
    journeyOptions,
    onProgress: logProgress,
  });

  console.log(
    `Batch summary written: ${path.relative(rootDir, result.summaryPath)}`,
  );
  console.log(`Total URLs: ${result.summary.total_urls}`);
  console.log(`Successes: ${result.summary.success_count}`);
  console.log(`Failures: ${result.summary.failure_count}`);
  console.log(`Skipped existing: ${result.summary.skipped_existing_count}`);
}

function firstPositionalArg(args) {
  const flagsWithValues = new Set([
    "--max-pages",
    "--mode",
    "--scope-mode",
    "--scope-path",
  ]);

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      if (
        flagsWithValues.has(arg) &&
        args[i + 1] &&
        !args[i + 1].startsWith("--")
      )
        i += 1;
      continue;
    }
    return arg;
  }

  return null;
}

function logProgress(event) {
  if (event.event === "start") {
    console.log(`[${event.index}/${event.total}] Starting ${event.url}`);
    return;
  }

  const status = event.result?.status || "unknown";
  const suffix = event.result?.error ? ` - ${event.result.error}` : "";
  console.log(`[${event.index}/${event.total}] ${status.toUpperCase()} ${event.url}${suffix}`);
}

function printHelp() {
  console.log(`Usage:
  node scripts/run-batch.js <urls.txt> [--mode=default|all-subdomains|specific-urls|full-journey] [Journey Mapper options]

Modes:
  default
    Existing Journey Mapper behaviour with exact-host scope. Skips existing audit folders in batch runs.

  specific-urls
    Use each URL as a start URL with exact-host scope and no subdomain expansion.
    This does not add new path-locking behaviour. Skips existing audit folders in batch runs.

  all-subdomains
    Existing behaviour plus same-site subdomain support. Unrelated external domains remain out of scope. Skips existing audit folders in batch runs.

  full-journey
    Specific start URLs plus same-site subdomain support and current selected-link visiting only.
    This is not recursive crawling. Skips existing audit folders in batch runs.

Examples:
  node scripts/run-batch.js urls.txt
  node scripts/run-batch.js urls.txt --mode=default
  node scripts/run-batch.js urls.txt --mode=all-subdomains --max-pages=10
  node scripts/run-batch.js urls.txt --mode=specific-urls
  node scripts/run-batch.js urls.txt --mode=full-journey --max-pages=10

Supported modes: ${Object.keys(BATCH_MODES).join(", ")}`);
}

main().catch((error) => {
  console.error(`Batch run failed: ${error?.message || error}`);
  process.exitCode = 1;
});
