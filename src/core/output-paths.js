const path = require("path");
const { ensureDir } = require("./file-utils");

function outputPathsForAudit(rootDir, auditKey) {
  const auditDir = path.join(rootDir, "data", auditKey);
  const journeysDir = path.join(auditDir, "journeys");
  const screenshotsDir = path.join(journeysDir, "screenshots");

  return {
    auditDir,
    journeysDir,
    screenshotsDir,
    journeyMapJson: path.join(journeysDir, "journey-map.json"),
  };
}

function ensureJourneyOutputDirs(paths) {
  ensureDir(paths.journeysDir);
  ensureDir(paths.screenshotsDir);
}

module.exports = {
  ensureJourneyOutputDirs,
  outputPathsForAudit,
};
