#!/usr/bin/env node

const path = require("path");
const { parseJourneyMapOptions } = require("../src/core/cli-options");
const { runBatch } = require("../src/batch/batch-runner");

async function main() {
  const args = process.argv.slice(2);
  const urlsFile = firstPositionalArg(args);

  if (!urlsFile) {
    console.error(
      "Usage: node scripts/run-batch.js <urls.txt> [--max-pages=20] [--force] [--scope-mode=soft|strict|global] [--scope-strict] [--scope-path=/path] [--global]",
    );
    process.exitCode = 1;
    return;
  }

  const rootDir = path.resolve(__dirname, "..");
  const result = await runBatch(urlsFile, {
    rootDir,
    journeyOptions: {
      ...parseJourneyMapOptions(args),
      rootDir,
    },
  });

  console.log(
    `Batch summary written: ${path.relative(rootDir, result.summaryPath)}`,
  );
  console.log(`Total URLs: ${result.summary.total_urls}`);
  console.log(`Successes: ${result.summary.success_count}`);
  console.log(`Failures: ${result.summary.failure_count}`);
}

function firstPositionalArg(args) {
  const flagsWithValues = new Set([
    "--max-pages",
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

main().catch((error) => {
  console.error(`Batch run failed: ${error?.message || error}`);
  process.exitCode = 1;
});
