#!/usr/bin/env node

const readline = require("readline");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { parseAuditInput } = require("../src/core/audit-key");
const { outputPathsForAudit } = require("../src/core/output-paths");

const MENU_OPTIONS = [
  {
    label: "Run batch from urls.txt, skip existing",
    run: () => runCommandOrThrow(["node", "scripts/run-batch.js", "urls.txt"]),
  },
  {
    label: "Run batch from urls.txt, all subdomains, skip existing",
    run: () =>
      runCommandOrThrow([
        "node",
        "scripts/run-batch.js",
        "urls.txt",
        "--mode=all-subdomains",
      ]),
  },
  {
    label: "Run specific URL",
    prompt: "Enter URL to audit: ",
    run: (answer) => runSpecificUrl(answer, { force: false }),
  },
  {
    label: "Run specific URL with overwrite",
    prompt: "Enter URL to audit with overwrite: ",
    run: (answer) => runSpecificUrl(answer, { force: true }),
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

async function runSpecificUrl(inputUrl, options = {}) {
  const rootDir = path.resolve(__dirname, "..");
  const audit = parseAuditInput(inputUrl, {});
  if (!audit) {
    throw new Error(`Invalid URL supplied: ${inputUrl}`);
  }

  const outputPaths = outputPathsForAudit(rootDir, audit.auditKey);
  const journeyMapPath = outputPaths.journeyMapJson;
  const excelExportPath = path.join(
    outputPaths.auditDir,
    "exports",
    "audit-export.xlsx",
  );
  const relativeJourneyMapPath = path.relative(rootDir, journeyMapPath);
  const relativeExcelExportPath = path.relative(rootDir, excelExportPath);
  const journeyCommand = ["node", "scripts/journey-map.js", inputUrl];
  if (options.force) journeyCommand.push("--force");

  await runCommandOrThrow(journeyCommand);
  console.log(`journey-map.json path: ${relativeJourneyMapPath}`);

  const exportCommand = [
    "node",
    "scripts/export-audit-xlsx.js",
    relativeJourneyMapPath,
  ];
  const exportCode = await runCommand(exportCommand);
  process.exitCode = exportCode;

  if (exportCode !== 0) {
    console.error(
      `Audit completed, but Excel export failed. Expected audit-export.xlsx path: ${relativeExcelExportPath}`,
    );
    throw new Error(`Excel export failed with exit code ${exportCode}.`);
  }

  console.log(`audit-export.xlsx path: ${relativeExcelExportPath}`);
}

main().catch((error) => {
  console.error(`Menu failed: ${error?.message || error}`);
  process.exitCode = 1;
});
