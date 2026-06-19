const { SITE_PROFILES } = require("../config/site-profiles");
const {
  buildCorpus,
  confidenceFromScore,
  matchRule,
} = require("./rule-matching");

function inferSiteProfile({ homepageStep, profileRules = SITE_PROFILES }) {
  const links = homepageStep?.discovered_links || [];
  const profileResults = Object.entries(profileRules)
    .map(([profile, config]) =>
      evaluateProfile(profile, config, links, homepageStep),
    )
    .filter((result) => result.confidence !== "unknown")
    .sort(compareProfiles);

  if (!profileResults.length) {
    return {
      primary_profile: "unknown",
      profiles: [
        {
          profile: "unknown",
          confidence: "unknown",
          score: 0,
          signals: ["insufficient_profile_evidence"],
          matched_rules: [],
        },
      ],
    };
  }

  return {
    primary_profile: profileResults[0].profile,
    profiles: profileResults,
  };
}

function evaluateProfile(profile, config, links, homepageStep) {
  const matchedByRule = new Map();
  let score = 0;

  for (const link of links) {
    const corpus = buildCorpus({ link, homepageStep });
    for (const rule of config.rules || []) {
      const matches = matchRule(rule, corpus);
      if (!matches.length) continue;

      if (!matchedByRule.has(rule.id)) {
        matchedByRule.set(rule.id, {
          rule_id: rule.id,
          weight: rule.weight,
          matches: [],
        });
        score += rule.weight;
      }

      const bucket = matchedByRule.get(rule.id);
      for (const match of matches) {
        if (bucket.matches.length < 5) bucket.matches.push(match);
      }
    }
  }

  const confidence = confidenceFromScore(score, config);
  const matchedRules = [...matchedByRule.values()].sort((a, b) =>
    a.rule_id.localeCompare(b.rule_id),
  );

  return {
    profile,
    confidence,
    score,
    signals: matchedRules.map((rule) => rule.rule_id),
    matched_rules: matchedRules,
  };
}

function compareProfiles(a, b) {
  const confidenceRank = { high: 3, medium: 2, low: 1, unknown: 0 };
  return (
    confidenceRank[b.confidence] - confidenceRank[a.confidence] ||
    b.score - a.score ||
    a.profile.localeCompare(b.profile)
  );
}

module.exports = {
  inferSiteProfile,
};
