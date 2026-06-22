const { isWithinScope } = require("../core/scope");
const { capturePageState } = require("./capture-page-state");

async function visitSelectedLinks({
  page,
  audit,
  outputPaths,
  selectedLinks,
  networkRecorder,
  startStepIndex,
  maxPages,
  options = {},
}) {
  const steps = [];
  const totalLimit = Math.max(1, maxPages || 20);
  const maxSecondarySteps = Math.max(0, totalLimit - 1);
  const linksToVisit = (selectedLinks || []).slice(0, maxSecondarySteps);

  for (const selectedLink of linksToVisit) {
    const stepIndex = startStepIndex + steps.length;
    if (stepIndex > totalLimit) break;

    if (!isWithinScope(selectedLink.url, audit)) {
      steps.push(
        skippedStep({
          stepIndex,
          selectedLink,
          message: "Selected link is outside allowed scope.",
        }),
      );
      continue;
    }

    try {
      networkRecorder.reset();
      const response = await page.goto(selectedLink.url, {
        waitUntil: "domcontentloaded",
      });
      await page
        .waitForLoadState("networkidle", {
          timeout: options.networkIdleTimeoutMs || 8_000,
        })
        .catch(() => {});

      const step = await capturePageState(page, audit, outputPaths, {
        stepIndex,
        label: labelForSelectedLink(selectedLink, stepIndex),
        requestedUrl: selectedLink.url,
        httpStatus: response ? response.status() : null,
      });
      step.tracking_signals.network_hosts = networkRecorder.hosts();
      step.source_selected_link = selectedLink;
      step.selected_links = [];
      steps.push(step);
    } catch (error) {
      steps.push(failedStep({ stepIndex, selectedLink, error }));
    }
  }

  return steps;
}

function labelForSelectedLink(selectedLink, stepIndex) {
  return selectedLink.text || `selected-${stepIndex}`;
}

function emptyPageSignals() {
  return {
    forms_count: 0,
    ctas: [],
    iframes: [],
    has_cart_link: false,
    has_search: false,
  };
}

function emptyTrackingSignals() {
  return {
    network_hosts: [],
    script_sources: [],
    vendors_observed: [],
    data_layer_present: "Unknown",
    data_layer_events: [],
    cookies_count: 0,
  };
}

function skippedStep({ stepIndex, selectedLink, message }) {
  return {
    step_index: stepIndex,
    url: selectedLink.url,
    final_url: null,
    title: "",
    http_status: null,
    screenshot: null,
    status: "skipped",
    links_found: 0,
    selected_links: [],
    discovered_links: [],
    page_signals: emptyPageSignals(),
    tracking_signals: emptyTrackingSignals(),
    source_selected_link: selectedLink,
    error: { message },
    notes: ["Selected priority link skipped; continuing run."],
  };
}

function failedStep({ stepIndex, selectedLink, error }) {
  return {
    step_index: stepIndex,
    url: selectedLink.url,
    final_url: null,
    title: "",
    http_status: null,
    screenshot: null,
    status: "failed",
    links_found: 0,
    selected_links: [],
    discovered_links: [],
    page_signals: emptyPageSignals(),
    tracking_signals: emptyTrackingSignals(),
    source_selected_link: selectedLink,
    error: { message: error?.message || String(error) },
    notes: ["Selected priority link failed to capture; continuing run."],
  };
}

module.exports = {
  failedStep,
  skippedStep,
  visitSelectedLinks,
};
