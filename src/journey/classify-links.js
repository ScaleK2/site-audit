const {
  GLOBAL_HIGH_INTENT_KEYWORDS,
  NOISE_KEYWORDS,
  UTILITY_PATH_SEGMENTS,
} = require("../config/journey-keywords");
const {
  SUB_PROFILE_LINK_SCORING_RULES,
} = require("../config/link-scoring-rules");
const {
  buildCorpus,
  matchRule,
  normaliseText,
  priorityFromScore,
  urlPath,
} = require("./rule-matching");

function classifyLinks({ links, homepageStep, siteProfile, selectedPatterns }) {
  const context = buildClassificationContext({ links, siteProfile });
  return (links || [])
    .map((link) =>
      classifyLink({
        link,
        homepageStep,
        siteProfile,
        selectedPatterns,
        context,
      }),
    )
    .sort(compareClassifiedLinks);
}

function classifyLink({
  link,
  homepageStep,
  siteProfile,
  selectedPatterns,
  context,
}) {
  const corpus = buildCorpus({ link, homepageStep });
  const matchedRules = [];
  const noiseRules = noiseMatches(link, corpus);
  const profiles = new Set();
  const categories = new Set();
  const stages = new Set();
  let score = 0;

  for (const pattern of selectedPatterns || []) {
    for (const stage of pattern.stages || []) {
      const stageRule = {
        id: `${pattern.id}:${stage.id}`,
        weight: pattern.priority === "high" ? 12 : 8,
        fields: ["url", "text"],
        terms: stage.keywords,
      };
      const matches = matchRule(stageRule, corpus);
      if (!matches.length) continue;

      score += stageRule.weight;
      profiles.add(pattern.profile);
      categories.add(pattern.category);
      stages.add(stage.id);
      matchedRules.push({
        rule_id: stageRule.id,
        weight: stageRule.weight,
        matches: matches.slice(0, 5),
      });
    }
  }

  for (const keyword of GLOBAL_HIGH_INTENT_KEYWORDS) {
    const rule = {
      id: `global_intent:${keyword}`,
      weight: 4,
      fields: ["url", "text"],
      terms: [keyword],
    };
    const matches = matchRule(rule, corpus);
    if (!matches.length) continue;
    score += rule.weight;
    matchedRules.push({
      rule_id: rule.id,
      weight: rule.weight,
      matches: matches.slice(0, 3),
    });
  }

  const subProfileRules = subProfileScoringMatches({
    corpus,
    siteProfile,
    context,
  });
  for (const rule of subProfileRules) {
    score += rule.weight;
    matchedRules.push(rule);
  }

  if (noiseRules.length)
    score -= Math.min(
      20,
      noiseRules.reduce((sum, rule) => sum + Math.abs(rule.weight), 0),
    );

  const hasBlockingNoise =
    noiseRules.length > 0 && !hasPositiveSubProfileMatch(subProfileRules);
  const priority = priorityFromScore(score, hasBlockingNoise);
  const confidence = confidenceForLink(score, priority, matchedRules.length);

  return {
    url: link.url,
    text: link.text,
    source: link.source || "",
    page_type: link.page_type || "",
    selection_reason: link.selection_reason || "",
    confidence: link.confidence || "",
    sources: link.sources || [],
    source_details: link.source_details || [],
    priority,
    score,
    classification: {
      profiles: [...profiles].sort(),
      categories: [...categories].sort(),
      stages: [...stages].sort(),
      sub_profile: siteProfile?.sub_profile || "unknown",
      confidence,
      matched_rules: matchedRules.sort((a, b) =>
        a.rule_id.localeCompare(b.rule_id),
      ),
      noise_rules: noiseRules,
    },
  };
}

function subProfileScoringMatches({ corpus, siteProfile, context }) {
  const subProfile = siteProfile?.sub_profile || "unknown";
  const rules = SUB_PROFILE_LINK_SCORING_RULES[subProfile] || [];
  const matchedRules = [];

  for (const rule of rules) {
    if (!scoringConditionMet(rule, context)) continue;
    const matches = matchRule(rule, corpus);
    if (!matches.length) continue;
    matchedRules.push({
      rule_id: rule.id,
      weight: rule.weight,
      matches: matches.slice(0, 5),
    });
  }

  return matchedRules;
}

function scoringConditionMet(rule, context) {
  if (!rule.when) return true;
  if (rule.when === "purchase_signal_available") {
    return context?.purchaseSignalAvailable === true;
  }
  return false;
}

function hasPositiveSubProfileMatch(rules) {
  return (rules || []).some((rule) => rule.weight > 0);
}

function buildClassificationContext({ links, siteProfile }) {
  const subProfile = siteProfile?.sub_profile || "unknown";
  const purchaseTerms = [
    "shop",
    "product",
    "products",
    "collection",
    "collections",
    "category",
    "cart",
    "basket",
    "checkout",
    "buy",
  ];
  const combinedLinks = (links || [])
    .map((link) => `${urlPath(link.url)} ${normaliseText(link.text)}`)
    .join(" ");

  return {
    subProfile,
    purchaseSignalAvailable: purchaseTerms.some((term) =>
      combinedLinks.includes(normaliseText(term)),
    ),
  };
}

function noiseMatches(link, corpus) {
  const combined = `${urlPath(link.url)} ${normaliseText(link.text)} ${corpus.text}`;
  const matches = [];

  for (const keyword of NOISE_KEYWORDS) {
    const normalized = normaliseText(keyword);
    if (normalized && combined.includes(normalized)) {
      matches.push({
        rule_id: `noise_keyword:${normalized}`,
        weight: -10,
        matched: keyword,
      });
    }
  }

  try {
    const url = new URL(link.url);
    const pathSegments = url.pathname.toLowerCase().split("/").filter(Boolean);
    for (const segment of pathSegments) {
      if (UTILITY_PATH_SEGMENTS.includes(segment)) {
        matches.push({
          rule_id: `utility_path:${segment}`,
          weight: -12,
          matched: segment,
        });
      }
    }
  } catch {}

  return dedupeNoise(matches).sort((a, b) =>
    a.rule_id.localeCompare(b.rule_id),
  );
}

function dedupeNoise(matches) {
  const byId = new Map();
  for (const match of matches) byId.set(match.rule_id, match);
  return [...byId.values()];
}

function confidenceForLink(score, priority, matchedRuleCount) {
  if (priority === "noise") return "high";
  if (score >= 30 && matchedRuleCount >= 2) return "high";
  if (score >= 16) return "medium";
  if (score > 0) return "low";
  return "unknown";
}

function compareClassifiedLinks(a, b) {
  const priorityRank = { high: 4, medium: 3, low: 2, unknown: 1, noise: 0 };
  return (
    priorityRank[b.priority] - priorityRank[a.priority] ||
    b.score - a.score ||
    a.url.localeCompare(b.url) ||
    String(a.text || "").localeCompare(String(b.text || ""))
  );
}

module.exports = {
  classifyLink,
  classifyLinks,
};
