const { JOURNEY_PATTERNS } = require("../config/journey-patterns");

function selectJourneyPatterns({
  siteProfile,
  journeyPatterns = JOURNEY_PATTERNS,
}) {
  const profileResults = siteProfile?.profiles || [];
  const subProfileResults = siteProfile?.sub_profiles || [];
  const selected = [];

  for (const subProfileResult of subProfileResults) {
    if (subProfileResult.confidence === "unknown") continue;
    const patterns = journeyPatterns[subProfileResult.sub_profile] || [];
    for (const pattern of patterns) {
      selected.push({
        ...pattern,
        profile: subProfileResult.parent_profile,
        sub_profile: subProfileResult.sub_profile,
        profile_confidence: subProfileResult.confidence,
        pattern_source: "sub_profile",
      });
    }
  }

  for (const profileResult of profileResults) {
    if (profileResult.confidence === "unknown") continue;
    const patterns = journeyPatterns[profileResult.profile] || [];
    for (const pattern of patterns) {
      selected.push({
        ...pattern,
        profile: profileResult.profile,
        sub_profile: null,
        profile_confidence: profileResult.confidence,
        pattern_source: "primary_profile",
      });
    }
  }

  if (!selected.length) {
    return (journeyPatterns.unknown || []).map((pattern) => ({
      ...pattern,
      profile: "unknown",
      sub_profile: "unknown",
      profile_confidence: "unknown",
      pattern_source: "fallback",
    }));
  }

  return selected.sort(comparePatterns);
}

function comparePatterns(a, b) {
  const confidenceRank = { high: 3, medium: 2, low: 1, unknown: 0 };
  const priorityRank = { high: 3, medium: 2, low: 1 };
  const sourceRank = { sub_profile: 2, primary_profile: 1, fallback: 0 };
  return (
    confidenceRank[b.profile_confidence] -
      confidenceRank[a.profile_confidence] ||
    sourceRank[b.pattern_source] - sourceRank[a.pattern_source] ||
    priorityRank[b.priority] - priorityRank[a.priority] ||
    a.id.localeCompare(b.id)
  );
}

module.exports = {
  selectJourneyPatterns,
};
