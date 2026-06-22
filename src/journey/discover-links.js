const { isWithinScope } = require("../core/scope");
const {
  isLikelyPageUrl,
  normaliseUrl,
  stableUrlSort,
} = require("../core/url-utils");

async function discoverLinks(page, audit) {
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

  const byUrl = new Map();
  for (const raw of rawLinks) {
    const url = normaliseUrl(raw.href, page.url());
    if (!url) continue;
    if (!isWithinScope(url, audit)) continue;
    if (!isLikelyPageUrl(url)) continue;

    const existing = byUrl.get(url);
    const text = raw.text.replace(/\s+/g, " ").trim().slice(0, 160);
    if (!existing || (!existing.text && text)) {
      byUrl.set(url, {
        url,
        text,
        rel: raw.rel,
        target: raw.target,
      });
    }
  }

  return [...byUrl.values()].sort(stableUrlSort);
}

module.exports = {
  discoverLinks,
};
