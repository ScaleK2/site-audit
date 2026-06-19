const { JOURNEY_PATTERNS } = require("../config/journey-patterns");

function selectJourneyPatterns({
  siteProfile,
  journeyPatterns = JOURNEY_PATTERNS,
}) {
  const profiles = siteProfile?.profiles || [];
  const selected = [];

  for (const profileResult of profiles) {
    if (profileResult.confidence === "unknown") continue;
    const patterns = journeyPatterns[profileResult.profile] || [];
    for (const pattern of patterns) {
      selected.push({
        ...pattern,
        profile: profileResult.profile,
        profile_confidence: profileResult.confidence,
      });
    }
  }

  if (!selected.length) {
    return (journeyPatterns.unknown || []).map((pattern) => ({
      ...pattern,
      profile: "unknown",
      profile_confidence: "unknown",
    }));
  }

  return selected.sort(comparePatterns);
}

function comparePatterns(a, b) {
  const confidenceRank = { high: 3, medium: 2, low: 1, unknown: 0 };
  const priorityRank = { high: 3, medium: 2, low: 1 };
  return (
    confidenceRank[b.profile_confidence] -
      confidenceRank[a.profile_confidence] ||
    priorityRank[b.priority] - priorityRank[a.priority] ||
    a.id.localeCompare(b.id)
  );
}

module.exports = {
  selectJourneyPatterns,
};
