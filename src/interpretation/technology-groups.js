const { allSteps, joinList, unique } = require("./evidence-utils");

const TECHNOLOGY_GROUPS = [
  group("Analytics", ["google-analytics", "analytics.google", "ga.js", "gtag", "matomo", "plausible", "segment", "omniture", "adobe analytics"]),
  group("Tag Management", ["googletagmanager", "gtm", "tealium", "ensighten", "adobedtm", "launch"]),
  group("Advertising / Media", ["doubleclick", "googleadservices", "facebook", "meta", "linkedin", "bing", "tiktok", "snap", "criteo"]),
  group("Consent Management", ["onetrust", "cookiebot", "trustarc", "didomi", "quantcast", "usercentrics", "consentmanager"]),
  group("Experimentation / Personalisation", ["optimizely", "vwo", "abtesting", "target", "monetate", "dynamic yield"]),
  group("Performance / Monitoring", ["newrelic", "datadog", "sentry", "akamai", "cloudflare", "speedcurve", "dynatrace"]),
  group("Video / Embedded Media", ["youtube", "vimeo", "wistia", "brightcove"]),
];

function buildTechnologyGroups(journeyMap) {
  const observed = collectObservedTechnology(journeyMap);
  const matched = new Set();
  const rows = TECHNOLOGY_GROUPS.map((item) => {
    const matches = observed.filter((value) => item.terms.some((term) => value.toLowerCase().includes(term)));
    for (const value of matches) matched.add(value);
    return {
      group: item.name,
      items: matches,
      observation: matches.length
        ? `Observed ${item.name.toLowerCase()} evidence includes ${joinList(matches, 6)}.`
        : `No ${item.name.toLowerCase()} evidence was observed in the captured audit data.`,
    };
  });

  const other = observed.filter((value) => !matched.has(value));
  rows.push({
    group: "Other observed hosts",
    items: other,
    observation: other.length
      ? `Other observed hosts/scripts include ${joinList(other, 8)}.`
      : "No additional observed hosts/scripts were available in the captured audit data.",
  });

  return rows;
}

function collectObservedTechnology(journeyMap) {
  const steps = allSteps(journeyMap);
  const stepEvidence = steps.flatMap((step) => [
    ...(step.tracking_signals?.network_hosts || []),
    ...(step.tracking_signals?.script_sources || []),
    ...(step.tracking_signals?.vendors_observed || []),
  ]);
  const consent = journeyMap?.consent || {};
  const consentEvidence = [
    ...(consent.platforms_observed || []),
    ...(consent.pre_consent?.network_hosts || []),
    ...(consent.post_consent?.network_hosts || []),
    ...(consent.pre_consent?.script_sources || []),
    ...(consent.post_consent?.script_sources || []),
  ];
  return unique([...stepEvidence, ...consentEvidence].map(String));
}

function group(name, terms) {
  return { name, terms: terms.map((term) => term.toLowerCase()) };
}

module.exports = {
  buildTechnologyGroups,
  collectObservedTechnology,
};
