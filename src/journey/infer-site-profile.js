const { SITE_PROFILES } = require("../config/site-profiles");
const { SITE_SUB_PROFILES } = require("../config/site-sub-profiles");
const {
  buildCorpus,
  confidenceFromScore,
  matchRule,
} = require("./rule-matching");

function inferSiteProfile({
  homepageStep,
  profileRules = SITE_PROFILES,
  subProfileRules = SITE_SUB_PROFILES,
}) {
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
      sub_profile: "unknown",
      profiles: [
        {
          profile: "unknown",
          confidence: "unknown",
          score: 0,
          signals: ["insufficient_profile_evidence"],
          matched_rules: [],
        },
      ],
      sub_profiles: [unknownSubProfile()],
    };
  }

  const primaryProfile = profileResults[0].profile;
  const subProfiles = inferSubProfiles({
    homepageStep,
    primaryProfile,
    subProfileRules,
  });

  return {
    primary_profile: primaryProfile,
    sub_profile: subProfiles[0]?.sub_profile || "unknown",
    profiles: profileResults,
    sub_profiles: subProfiles,
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

function inferSubProfiles({ homepageStep, primaryProfile, subProfileRules }) {
  const links = homepageStep?.discovered_links || [];
  const subProfileResults = Object.entries(subProfileRules || {})
    .filter(([, config]) => isCompatibleSubProfile(primaryProfile, config))
    .map(([subProfile, config]) =>
      evaluateSubProfile(subProfile, config, links, homepageStep),
    )
    .filter((result) => result.confidence !== "unknown")
    .sort(compareSubProfiles);

  if (!subProfileResults.length) return [unknownSubProfile(primaryProfile)];
  return subProfileResults;
}

function evaluateSubProfile(subProfile, config, links, homepageStep) {
  const result = evaluateProfile(subProfile, config, links, homepageStep);
  return {
    sub_profile: subProfile,
    parent_profile: config.parentProfile || "unknown",
    label: config.label || subProfile,
    confidence: result.confidence,
    score: result.score,
    signals: result.signals,
    matched_rules: result.matched_rules,
  };
}

function isCompatibleSubProfile(primaryProfile, config) {
  if (!config?.parentProfile) return true;
  if (primaryProfile === "unknown") return false;
  return config.parentProfile === primaryProfile;
}

function unknownSubProfile(parentProfile = "unknown") {
  return {
    sub_profile: "unknown",
    parent_profile: parentProfile,
    label: "Unknown",
    confidence: "unknown",
    score: 0,
    signals: ["insufficient_sub_profile_evidence"],
    matched_rules: [],
  };
}

function compareSubProfiles(a, b) {
  const confidenceRank = { high: 3, medium: 2, low: 1, unknown: 0 };
  return (
    confidenceRank[b.confidence] - confidenceRank[a.confidence] ||
    b.score - a.score ||
    a.sub_profile.localeCompare(b.sub_profile)
  );
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
