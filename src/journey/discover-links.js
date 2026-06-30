const { evaluateScope, isWithinScope } = require("../core/scope");
const {
  isLikelyPageUrl,
  normaliseUrl,
  stableUrlSort,
} = require("../core/url-utils");

async function discoverLinks(page, audit) {
  const evidence = await discoverLinkEvidence(page, audit);
  return evidence.discovered_links;
}

async function discoverLinkEvidence(page, audit) {
  const rawLinks = await page.$$eval("a[href]", (anchors) =>
    anchors.map((anchor) => ({
      href: anchor.getAttribute("href") || "",
      text: (
        anchor.innerText ||
        anchor.getAttribute("aria-label") ||
        anchor.getAttribute("title") ||
        ""
      ).trim(),
      rel: anchor.getAttribute("rel") || "",
      target: anchor.getAttribute("target") || "",
    })),
  );

  return evaluateRawLinks({
    rawLinks,
    baseUrl: page.url(),
    audit,
  });
}

function evaluateRawLinks({ rawLinks, baseUrl, audit }) {
  const byUrl = new Map();
  const rawLinkCandidates = [];
  const filteredOutLinks = [];

  for (const raw of rawLinks || []) {
    const url = normaliseUrl(raw.href, baseUrl);
    const text = normaliseLinkText(raw.text);
    const scopeEvaluation = evaluateScope(url || raw.href, audit);
    const candidate = {
      href: raw.href,
      url,
      text,
      rel: raw.rel || "",
      target: raw.target || "",
      host: scopeEvaluation.host,
      scope_evaluation: scopeEvaluation,
    };
    rawLinkCandidates.push(candidate);

    if (!url) {
      filteredOutLinks.push(rejectedLink(candidate, "noise"));
      continue;
    }

    if (!isLikelyPageUrl(url)) {
      filteredOutLinks.push(rejectedLink(candidate, "static_asset"));
      continue;
    }

    if (!isWithinScope(url, audit)) {
      filteredOutLinks.push(rejectedLink(candidate, "out_of_scope"));
      continue;
    }

    const existing = byUrl.get(url);
    if (existing) {
      filteredOutLinks.push(rejectedLink(candidate, "duplicate"));
      if (!existing.text && text) existing.text = text;
      continue;
    }

    byUrl.set(url, {
      url,
      text,
      rel: raw.rel || "",
      target: raw.target || "",
    });
  }

  return {
    discovered_links: [...byUrl.values()].sort(stableUrlSort),
    raw_link_candidates: rawLinkCandidates,
    filtered_out_links: filteredOutLinks,
  };
}

function rejectedLink(candidate, reason) {
  return {
    href: candidate.href,
    url: candidate.url,
    text: candidate.text,
    host: candidate.host,
    reason,
    scope_evaluation: candidate.scope_evaluation,
  };
}

function normaliseLinkText(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 160);
}

module.exports = {
  discoverLinkEvidence,
  discoverLinks,
  evaluateRawLinks,
};
