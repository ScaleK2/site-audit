function normaliseText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .trim();
}

function urlPath(value) {
  try {
    const u = new URL(value);
    return `${u.pathname} ${u.search}`.toLowerCase().replace(/[\s_-]+/g, " ");
  } catch {
    return normaliseText(value);
  }
}

function buildCorpus({ link, homepageStep }) {
  const ctas = homepageStep?.page_signals?.ctas || [];
  return {
    url: urlPath(link?.url || ""),
    text: normaliseText(link?.text || ""),
    page: normaliseText([homepageStep?.title, ...ctas].join(" ")),
    pageSignal: pageSignals(homepageStep),
  };
}

function pageSignals(homepageStep) {
  const signals = [];
  const pageSignals = homepageStep?.page_signals || {};
  if (pageSignals.forms_count > 0) signals.push("has_forms");
  if (pageSignals.has_cart_link) signals.push("has_cart_link");
  if (pageSignals.has_search) signals.push("has_search");
  return signals.join(" ");
}

function matchRule(rule, corpus) {
  const matches = [];
  for (const field of rule.fields || []) {
    const haystack = corpus[field] || "";
    for (const term of rule.terms || []) {
      const needle = normaliseText(term);
      if (needle && haystack.includes(needle)) {
        matches.push({ field, term, value: term });
      }
    }
  }

  return matches;
}

function confidenceFromScore(score, config) {
  if (!config || score <= 0) return "unknown";
  if (score >= config.highConfidenceScore) return "high";
  if (score >= config.mediumConfidenceScore) return "medium";
  if (score >= config.minScore) return "low";
  return "unknown";
}

function priorityFromScore(score, hasNoise) {
  if (hasNoise) return "noise";
  if (score >= 30) return "high";
  if (score >= 16) return "medium";
  if (score > 0) return "low";
  return "unknown";
}

module.exports = {
  buildCorpus,
  confidenceFromScore,
  matchRule,
  normaliseText,
  priorityFromScore,
  urlPath,
};
