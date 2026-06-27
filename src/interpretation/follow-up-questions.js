const { discoveryUrls, joinList, selectedLinks, unique } = require("./evidence-utils");

function buildFollowUpQuestions({ journeyMap, siteDiscovery, journeyFamilies, coverage }) {
  const questions = [];
  const evidenceItems = collectEvidenceText(journeyMap, siteDiscovery);

  pushIf(evidenceItems, /alumni/i, questions, "Alumni", "Alumni pages were discovered but not represented during the audit. Should Alumni be considered in scope?");
  pushIf(evidenceItems, /\b(agent|adviser|advisor)\b/i, questions, "Agent / Adviser", "Agent or adviser pages were observed or discovered. Should Agent / Adviser journeys be treated as a separate journey family?");
  pushIf(evidenceItems, /\b(portal|login|signin|sign-in|account)\b/i, questions, "Authenticated portals", "Authenticated portal evidence was observed or discovered. Should authenticated portals be reviewed separately?");
  pushIf(evidenceItems, /library|libraries/i, questions, "Library / Services", "Library or service pages were discovered. Should Library / services journeys be included in a deeper audit?");
  pushIf(evidenceItems, /events?/i, questions, "Events", "Events pages were discovered. Are Events part of acquisition, engagement, or operational scope?");

  const discoveredHosts = unique(discoveryUrls(siteDiscovery).map((item) => host(item.url)).filter(Boolean));
  if (discoveredHosts.length >= 4) {
    questions.push(question(
      "Same-site domains",
      `Multiple same-site domains were discovered (${joinList(discoveredHosts, 6)}). Which same-site subdomains are in scope for the consolidated journey audit?`,
      joinList(discoveredHosts, 6),
    ));
  }

  if (["not_observed", "no_accept_action_detected", "accept_failed"].includes(journeyMap?.consent?.status)) {
    questions.push(question(
      "Consent",
      "Consent interaction was not fully observed in the captured evidence. Should consent behaviour be reviewed manually for scenarios not covered by this audit?",
      `Consent status: ${journeyMap.consent.status}`,
    ));
  }

  const discoveredOnly = (journeyFamilies || []).filter((item) => item.status === "Discovered only");
  if (discoveredOnly.length >= 2) {
    questions.push(question(
      "Discovered-only journeys",
      `Several journey families were discovered but not represented (${joinList(discoveredOnly.map((item) => item.family), 6)}). Which discovered-only journey families should be included in a deeper audit?`,
      coverage?.evidence || joinList(discoveredOnly.map((item) => item.family), 6),
    ));
  }

  return dedupeQuestions(questions);
}

function collectEvidenceText(journeyMap, siteDiscovery) {
  const discovered = discoveryUrls(siteDiscovery).map((item) => [item.url, item.text, item.title, item.page_type].join(" "));
  const selected = selectedLinks(journeyMap).map((link) => [link.url, link.text, link.page_type].join(" "));
  const steps = (journeyMap?.journeys || []).flatMap((journey) => journey.steps || []).map((step) => [step.url, step.final_url, step.title].join(" "));
  return [...discovered, ...selected, ...steps].join(" \n ");
}

function pushIf(haystack, pattern, questions, topic, text) {
  if (pattern.test(haystack)) questions.push(question(topic, text, `Matched evidence pattern: ${pattern.source}`));
}

function question(topic, text, evidence) {
  return { topic, question: text, evidence };
}

function dedupeQuestions(questions) {
  const seen = new Set();
  return questions.filter((item) => {
    if (seen.has(item.question)) return false;
    seen.add(item.question);
    return true;
  });
}

function host(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch (_error) {
    return "";
  }
}

module.exports = {
  buildFollowUpQuestions,
};
