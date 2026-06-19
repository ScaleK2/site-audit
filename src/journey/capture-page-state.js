const path = require("path");
const { discoverLinks } = require("./discover-links");

function screenshotNameForStep(stepIndex, label = "page") {
  const safeLabel =
    String(label || "page")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "page";
  return `${String(stepIndex).padStart(3, "0")}-${safeLabel}.png`;
}

async function capturePageState(page, audit, outputPaths, options = {}) {
  const stepIndex = options.stepIndex || 1;
  const label = options.label || (stepIndex === 1 ? "homepage" : "page");
  const screenshotName = screenshotNameForStep(stepIndex, label);
  const screenshotPath = path.join(outputPaths.screenshotsDir, screenshotName);
  const screenshotRelativePath = path.posix.join(
    "journeys",
    "screenshots",
    screenshotName,
  );

  await page.screenshot({ path: screenshotPath, fullPage: true });

  const [title, links, pageSignals, trackingSignals] = await Promise.all([
    page.title().catch(() => ""),
    discoverLinks(page, audit),
    extractPageSignals(page),
    extractTrackingSignals(page),
  ]);

  return {
    step_index: stepIndex,
    url: options.requestedUrl || page.url(),
    final_url: page.url(),
    title,
    http_status: options.httpStatus ?? null,
    screenshot: screenshotRelativePath,
    status: "visited",
    links_found: links.length,
    selected_links: [],
    discovered_links: links,
    page_signals: pageSignals,
    tracking_signals: trackingSignals,
    notes: [],
  };
}

async function extractPageSignals(page) {
  return page
    .evaluate(() => {
      const textOf = (el) =>
        (
          el.innerText ||
          el.value ||
          el.getAttribute("aria-label") ||
          el.getAttribute("title") ||
          ""
        ).trim();
      const ctas = [
        ...document.querySelectorAll(
          "a, button, input[type='button'], input[type='submit']",
        ),
      ]
        .map(textOf)
        .filter(Boolean)
        .slice(0, 50);

      return {
        forms_count: document.forms.length,
        ctas,
        iframes: [...document.querySelectorAll("iframe[src]")]
          .map((iframe) => iframe.src)
          .slice(0, 50),
        has_cart_link: [...document.querySelectorAll("a[href]")].some((a) =>
          /cart|basket|bag|checkout/i.test(a.href + " " + textOf(a)),
        ),
        has_search: Boolean(
          document.querySelector(
            "input[type='search'], input[name*='search' i], form[action*='search' i]",
          ),
        ),
      };
    })
    .catch(() => ({
      forms_count: 0,
      ctas: [],
      iframes: [],
      has_cart_link: false,
      has_search: false,
    }));
}

async function extractTrackingSignals(page) {
  return page
    .evaluate(() => {
      const scripts = [...document.scripts]
        .map((script) => script.src)
        .filter(Boolean);
      const dataLayer = window.dataLayer;
      const events = Array.isArray(dataLayer)
        ? dataLayer
            .map((item) => item && item.event)
            .filter(Boolean)
            .map(String)
            .slice(0, 100)
        : [];

      return {
        network_hosts: [],
        script_sources: scripts.slice(0, 200),
        vendors_observed: [],
        data_layer_present: Array.isArray(dataLayer)
          ? "Observed"
          : "Not observed",
        data_layer_events: [...new Set(events)],
        cookies_count: document.cookie
          ? document.cookie.split(";").filter(Boolean).length
          : 0,
      };
    })
    .catch(() => ({
      network_hosts: [],
      script_sources: [],
      vendors_observed: [],
      data_layer_present: "Unknown",
      data_layer_events: [],
      cookies_count: 0,
    }));
}

module.exports = {
  capturePageState,
  screenshotNameForStep,
};
