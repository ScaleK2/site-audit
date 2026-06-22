const { normaliseText, urlPath } = require("./rule-matching");

function buildDiscoveryStatus({ audit, homepageStep, classifiedLinks, selectedLinks }) {
  const notes = [];
  const usefulLinks = (classifiedLinks || []).filter(
    (link) => link.priority !== "noise" && link.priority !== "unknown",
  );

  if (!homepageStep || homepageStep.status !== "visited") {
    notes.push("homepage_capture_not_successful");
  }

  if (!classifiedLinks || classifiedLinks.length === 0) {
    notes.push("no_homepage_links_classified");
  }

  if (!selectedLinks || selectedLinks.length === 0) {
    notes.push("no_selected_priority_links");
  }

  if ((homepageStep?.links_found || 0) > 0 && usefulLinks.length <= 2) {
    notes.push("low_useful_link_count_observed");
  }

  if ((homepageStep?.page_signals?.forms_count || 0) > 0) {
    notes.push("form_present_on_homepage");
  }

  if (isLandingPageLikeUrl(audit?.homeUrl)) {
    notes.push("landing_page_like_url_observed");
  }

  if (hasThankYouPattern(homepageStep)) {
    notes.push("thank_you_pattern_observed_in_links");
  }

  return {
    capture_success: homepageStep?.status === "visited",
    classification_success: (classifiedLinks || []).length > 0,
    journey_selection_success: (selectedLinks || []).length > 0,
    selected_steps_count: (selectedLinks || []).length,
    notes: [...new Set(notes)].sort(),
  };
}

function isLandingPageLikeUrl(value) {
  const path = urlPath(value || "");
  if (!path || path === "/") return false;
  const terms = [
    "campaign",
    "development",
    "developments",
    "property",
    "properties",
    "apartments",
    "residences",
    "community",
    "communities",
    "estate",
    "landing",
  ];
  return terms.some((term) => path.includes(normaliseText(term)));
}

function hasThankYouPattern(homepageStep) {
  const links = homepageStep?.discovered_links || [];
  const combined = links
    .map((link) => `${urlPath(link.url)} ${normaliseText(link.text)}`)
    .join(" ");
  return [
    "thank you",
    "thank-you",
    "thanks",
    "confirmation",
    "success",
  ].some((term) => combined.includes(normaliseText(term)));
}

module.exports = {
  buildDiscoveryStatus,
};
