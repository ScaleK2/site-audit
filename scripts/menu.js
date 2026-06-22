#!/usr/bin/env node

const readline = require("readline");
const { spawn } = require("child_process");

const MENU_OPTIONS = [
  {
    label: "Run batch from urls.txt, skip existing",
    command: ["node", "scripts/run-batch.js", "urls.txt"],
  },
  {
    label: "Run batch from urls.txt, all subdomains, skip existing",
    command: [
      "node",
      "scripts/run-batch.js",
      "urls.txt",
      "--mode=all-subdomains",
    ],
  },
  {
    label: "Run specific URL",
    prompt: "Enter URL to audit: ",
    buildCommand: (answer) => ["node", "scripts/journey-map.js", answer],
  },
  {
    label: "Run specific URL with overwrite",
    prompt: "Enter URL to audit with overwrite: ",
    buildCommand: (answer) => [
      "node",
      "scripts/journey-map.js",
      answer,
      "--force",
    ],
  },
  {
    label: "Export existing audit to Excel",
    prompt: "Enter path to journey-map.json: ",
    buildCommand: (answer) => ["node", "scripts/export-audit-xlsx.js", answer],
  },
];

async function main() {
  printMenu();
  const choice = await ask("Select an option: ");
  const index = Number.parseInt(choice, 10) - 1;
  const option = MENU_OPTIONS[index];

  if (!option) {
    console.error("Invalid menu option.");
    process.exitCode = 1;
    return;
  }

  let command = option.command;
  if (option.buildCommand) {
    const answer = (await ask(option.prompt)).trim();
    if (!answer) {
      console.error("No value supplied.");
      process.exitCode = 1;
      return;
    }
    command = option.buildCommand(answer);
  }

  await runCommand(command);
}

function printMenu() {
  console.log("Site Audit menu");
  MENU_OPTIONS.forEach((option, index) => {
    console.log(`${index + 1}. ${option.label}`);
  });
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function runCommand(command) {
  const [binary, ...args] = command;
  console.log(`Running: ${command.join(" ")}`);

  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      process.exitCode = code || 0;
      resolve();
    });
  });
}

main().catch((error) => {
  console.error(`Menu failed: ${error?.message || error}`);
  process.exitCode = 1;
});
