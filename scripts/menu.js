#!/usr/bin/env node

const readline = require("readline");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { runBatch } = require("../src/batch/batch-runner");
const { runSiteDiscovery } = require("../src/discovery/site-discovery-runner");

const MENU_OPTIONS = [
  {
    label: "Run batch from urls.txt",
    run: () => runCommandOrThrow(["node", "scripts/run-batch.js", "urls.txt"]),
  },
  {
    label: "Run audit on specific URL",
    prompt: "Enter seed URL to audit: ",
    run: (answer) => runSpecificUrl(answer),
  },
  {
    label: "Exit",
    run: () => {
      console.log("Exiting Site Audit menu.");
    },
  },
];

async function main() {
  const prompt = createPrompt();

  try {
    printMenu();
    const choice = await prompt.ask("Select an option: ");
    const index = Number.parseInt(choice, 10) - 1;
    const option = MENU_OPTIONS[index];

    if (!option) {
      console.error("Invalid menu option.");
      process.exitCode = 1;
      return;
    }

    let answer = "";
    if (option.prompt) {
      answer = (await prompt.ask(option.prompt)).trim();
      if (!answer) {
        console.error("No value supplied.");
        process.exitCode = 1;
        return;
      }
    }

    await option.run(answer);
  } finally {
    prompt.close();
  }
}

function printMenu() {
  console.log("Site Audit menu");
  MENU_OPTIONS.forEach((option, index) => {
    console.log(`${index + 1}. ${option.label}`);
  });
}

function createPrompt() {
  if (!process.stdin.isTTY) {
    const answers = fs.readFileSync(0, "utf8").split(/\r?\n/);
    return {
      ask(question) {
        process.stdout.write(question);
        return Promise.resolve(answers.shift() || "");
      },
      close() {},
    };
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return {
    ask(question) {
      return ask(rl, question);
    },
    close() {
      rl.close();
    },
  };
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

function runCommand(command) {
  const [binary, ...args] = command;
  console.log(`Running: ${command.join(" ")}`);

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      resolve(code || 0);
    });
  });
}

async function runCommandOrThrow(command) {
  const code = await runCommand(command);
  process.exitCode = code;
  if (code !== 0) {
    throw new Error(`Command failed with exit code ${code}: ${command.join(" ")}`);
  }
}

async function runSpecificUrl(inputUrl) {
  const rootDir = path.resolve(__dirname, "..");
  const discoveryResult = await runSiteDiscovery(inputUrl, { rootDir });
  const discoveryUrlsPath = relativePath(rootDir, discoveryResult.urlsTxtPath);
  const discoveryJsonPath = relativePath(
    rootDir,
    discoveryResult.siteDiscoveryJsonPath,
  );

  console.log(`Discovery urls.txt path: ${discoveryUrlsPath}`);
  console.log(`site-discovery.json path: ${discoveryJsonPath}`);

  const batchResult = await runBatch(discoveryResult.urlsTxtPath, {
    rootDir,
    mode: "full-journey",
    overwriteExisting: true,
    onProgress: logBatchProgress,
  });

  console.log(`Batch summary path: ${relativePath(rootDir, batchResult.summaryPath)}`);
  const excelPaths = batchResult.summary.results
    .filter((result) => result.status === "success" && result.excel_export_path)
    .map((result) => result.excel_export_path);

  if (excelPaths.length) {
    console.log("Excel output paths:");
    for (const excelPath of excelPaths) console.log(`- ${excelPath}`);
  } else {
    console.log("Excel output paths: none generated.");
  }
}

function logBatchProgress(event) {
  if (event.event === "start") {
    console.log(`[${event.index}/${event.total}] Starting ${event.url}`);
    return;
  }

  const status = event.result?.status || "unknown";
  const suffix = event.result?.error ? ` - ${event.result.error}` : "";
  console.log(`[${event.index}/${event.total}] ${status.toUpperCase()} ${event.url}${suffix}`);
}

function relativePath(rootDir, filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join(path.posix.sep);
}

main().catch((error) => {
  console.error(`Menu failed: ${error?.message || error}`);
  process.exitCode = 1;
});
