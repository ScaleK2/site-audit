#!/usr/bin/env node

const path = require("path");
const { parseJourneyMapOptions } = require("../src/core/cli-options");
const { runJourneyMap } = require("../src/journey/journey-runner");

async function main() {
  const args = process.argv.slice(2);
  const inputUrl = firstPositionalArg(args);

  if (!inputUrl) {
    console.error(
      "Usage: node scripts/journey-map.js <url> [--max-pages=20] [--force] [--scope-mode=soft|strict|global] [--scope-strict] [--scope-path=/path] [--global]",
    );
    process.exitCode = 1;
    return;
  }

  const options = {
    ...parseJourneyMapOptions(args),
    rootDir: path.resolve(__dirname, ".."),
  };

  const result = await runJourneyMap(inputUrl, options);
  const homepageStep = result.journeyMap.journeys[0].steps[0];

  console.log(
    `Journey map written: ${path.relative(options.rootDir, result.outputPaths.journeyMapJson)}`,
  );
  console.log(
    `Screenshots written: ${path.relative(options.rootDir, result.outputPaths.screenshotsDir)}`,
  );
  console.log(`Audit key: ${result.audit.auditKey}`);
  console.log(`Homepage links discovered: ${homepageStep.links_found}`);
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
  console.error(`Journey map failed: ${error?.message || error}`);
  process.exitCode = 1;
});
