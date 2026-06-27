const XLSX = require("xlsx");

const SHEET_DEFINITIONS = {
  "Audit Summary": ["Field", "Value"],
  "Site Profile": [
    "Type",
    "Profile",
    "Parent Profile",
    "Label",
    "Confidence",
    "Score",
    "Signals",
    "Matched Rules",
    "Matched Terms",
  ],
  "Discovery Status": ["Field", "Value"],
  "Journey Steps": [
    "Journey ID",
    "Journey Label",
    "Journey Profile",
    "Journey Sub Profile",
    "Journey Category",
    "Journey Priority",
    "Step Index",
    "Step Status",
    "Label",
    "URL",
    "Final URL",
    "Title",
    "HTTP Status",
    "Screenshot Path",
    "Links Found",
    "Forms Count",
    "Has Search",
    "Has Cart Link",
    "Cookies Count",
    "Data Layer Present",
    "Notes",
    "Error",
  ],
  "Selected Links": [
    "Source Step Index",
    "Source Step URL",
    "Selected URL",
    "Selected Text",
    "Priority",
    "Score",
    "Profiles",
    "Sub Profile",
    "Categories",
    "Stages",
    "Confidence",
    "Matched Rules",
    "Noise Rules",
  ],
  "Consent Review": ["Section", "Field", "Value"],
  "Technology - Network Evidence": [
    "Step Index",
    "Step URL",
    "Final URL",
    "Title",
    "Network Hosts",
    "Script Sources",
    "Vendors Observed",
    "Data Layer Present",
    "Data Layer Events",
    "Cookies Count",
    "Iframes",
  ],
  "Screenshot Registry": [
    "Journey ID",
    "Journey Label",
    "Step Index",
    "Label",
    "URL",
    "Final URL",
    "Title",
    "HTTP Status",
    "Screenshot Exists",
    "Screenshot Path",
    "Source Selected Link URL",
    "Source Selected Link Text",
    "Source Selected Link Priority",
    "Source Selected Link Score",
    "Selected Reason / Matched Rules",
    "Noise Rules",
  ],
  "Audit Evidence Catalogue": ["Evidence Type", "Count", "Notes"],
  "Limits - Notes": [
    "Type",
    "Code",
    "Message",
    "Impact",
    "Journey ID",
    "Step Index",
    "URL",
  ],
};

function rowsToSheet(rows, columns) {
  const normalizedRows = (rows && rows.length ? rows : [emptyRow(columns)]).map(
    (row) => normalizeRow(row, columns),
  );
  const worksheet = XLSX.utils.json_to_sheet(normalizedRows, { header: columns });
  worksheet["!cols"] = columns.map((column) => ({ wch: widthForColumn(column) }));
  return worksheet;
}

function buildSiteProfileRows(journeyMap) {
  const profile = journeyMap.site_profile || {};
  const rows = [
    {
      Type: "summary",
      Profile: profile.primary_profile,
      "Parent Profile": "",
      Label: "Primary profile",
      Confidence: profile.profiles?.[0]?.confidence,
      Score: profile.profiles?.[0]?.score,
      Signals: joinValues(profile.profiles?.[0]?.signals),
      "Matched Rules": ruleIds(profile.profiles?.[0]?.matched_rules),
      "Matched Terms": matchedTerms(profile.profiles?.[0]?.matched_rules),
    },
    {
      Type: "summary",
      Profile: profile.sub_profile,
      "Parent Profile": profile.primary_profile,
      Label: "Sub profile",
      Confidence: profile.sub_profiles?.[0]?.confidence,
      Score: profile.sub_profiles?.[0]?.score,
      Signals: joinValues(profile.sub_profiles?.[0]?.signals),
      "Matched Rules": ruleIds(profile.sub_profiles?.[0]?.matched_rules),
      "Matched Terms": matchedTerms(profile.sub_profiles?.[0]?.matched_rules),
    },
  ];

  for (const item of profile.profiles || []) {
    rows.push({
      Type: "profile",
      Profile: item.profile,
      "Parent Profile": "",
      Label: item.label,
      Confidence: item.confidence,
      Score: item.score,
      Signals: joinValues(item.signals),
      "Matched Rules": ruleIds(item.matched_rules),
      "Matched Terms": matchedTerms(item.matched_rules),
    });
  }

  for (const item of profile.sub_profiles || []) {
    rows.push({
      Type: "sub_profile",
      Profile: item.sub_profile,
      "Parent Profile": item.parent_profile,
      Label: item.label,
      Confidence: item.confidence,
      Score: item.score,
      Signals: joinValues(item.signals),
      "Matched Rules": ruleIds(item.matched_rules),
      "Matched Terms": matchedTerms(item.matched_rules),
    });
  }

  return rows;
}

function buildDiscoveryStatusRows(journeyMap) {
  const status = journeyMap.discovery_status || {};
  return [
    fieldRow("Capture Success", status.capture_success),
    fieldRow("Classification Success", status.classification_success),
    fieldRow("Journey Selection Success", status.journey_selection_success),
    fieldRow("Selected Steps Count", status.selected_steps_count),
    fieldRow("Notes", joinValues(status.notes)),
  ];
}

function buildJourneyStepRows(journeyMap) {
  return journeyStepPairs(journeyMap).map(({ journey, step }) => ({
    "Journey ID": journey.journey_id,
    "Journey Label": journey.label,
    "Journey Profile": journey.profile,
    "Journey Sub Profile": journey.sub_profile,
    "Journey Category": journey.category,
    "Journey Priority": journey.priority,
    "Step Index": step.step_index,
    "Step Status": step.status,
    Label: stepLabel(step),
    URL: step.url,
    "Final URL": step.final_url,
    Title: step.title,
    "HTTP Status": step.http_status,
    "Screenshot Path": step.screenshot,
    "Links Found": step.links_found,
    "Forms Count": step.page_signals?.forms_count,
    "Has Search": step.page_signals?.has_search,
    "Has Cart Link": step.page_signals?.has_cart_link,
    "Cookies Count": step.tracking_signals?.cookies_count,
    "Data Layer Present": step.tracking_signals?.data_layer_present,
    Notes: joinValues(step.notes),
    Error: step.error?.message,
  }));
}

function buildSelectedLinkRows(journeyMap) {
  const rows = [];
  for (const { step } of journeyStepPairs(journeyMap)) {
    for (const link of step.selected_links || []) {
      rows.push({
        "Source Step Index": step.step_index,
        "Source Step URL": step.url,
        "Selected URL": link.url,
        "Selected Text": link.text,
        Priority: link.priority,
        Score: link.score,
        Profiles: joinValues(link.classification?.profiles),
        "Sub Profile": link.classification?.sub_profile,
        Categories: joinValues(link.classification?.categories),
        Stages: joinValues(link.classification?.stages),
        Confidence: link.classification?.confidence,
        "Matched Rules": ruleIds(link.classification?.matched_rules),
        "Noise Rules": ruleIds(link.classification?.noise_rules),
      });
    }
  }
  return rows;
}

function buildConsentReviewRows(journeyMap) {
  const consent = journeyMap.consent || {};
  const rows = [
    consentRow("Summary", "Status", consent.status),
    consentRow("Summary", "Platforms Observed", joinValues(consent.platforms_observed)),
    consentRow("Summary", "Notes", joinValues(consent.notes)),
    consentRow("Accept Action", "Attempted", consent.accept_action?.attempted),
    consentRow("Accept Action", "Matched Text", consent.accept_action?.matched_text),
    consentRow(
      "Accept Action",
      "Selector Strategy",
      consent.accept_action?.selector_strategy,
    ),
    consentRow("Accept Action", "Status", consent.accept_action?.status),
  ];

  appendConsentSnapshotRows(rows, "Pre Consent", consent.pre_consent);
  appendConsentSnapshotRows(rows, "Post Consent", consent.post_consent);

  const changes = consent.state_changes || {};
  for (const [field, value] of Object.entries(changes)) {
    rows.push(consentRow("State Changes", labelFromKey(field), flattenValue(value)));
  }

  return rows;
}

function buildTechnologyNetworkRows(journeyMap) {
  return journeyStepPairs(journeyMap).map(({ step }) => ({
    "Step Index": step.step_index,
    "Step URL": step.url,
    "Final URL": step.final_url,
    Title: step.title,
    "Network Hosts": joinValues(step.tracking_signals?.network_hosts),
    "Script Sources": joinValues(step.tracking_signals?.script_sources),
    "Vendors Observed": joinValues(step.tracking_signals?.vendors_observed),
    "Data Layer Present": step.tracking_signals?.data_layer_present,
    "Data Layer Events": joinValues(step.tracking_signals?.data_layer_events),
    "Cookies Count": step.tracking_signals?.cookies_count,
    Iframes: joinValues(step.page_signals?.iframes),
  }));
}

function buildScreenshotRegistryRows(journeyMap) {
  return journeyStepPairs(journeyMap).map(({ journey, step }) => {
    const source = step.source_selected_link || {};
    return {
      "Journey ID": journey.journey_id,
      "Journey Label": journey.label,
      "Step Index": step.step_index,
      Label: stepLabel(step),
      URL: step.url,
      "Final URL": step.final_url,
      Title: step.title,
      "HTTP Status": step.http_status,
      "Screenshot Exists": Boolean(step.screenshot),
      "Screenshot Path": step.screenshot,
      "Source Selected Link URL": source.url,
      "Source Selected Link Text": source.text,
      "Source Selected Link Priority": source.priority,
      "Source Selected Link Score": source.score,
      "Selected Reason / Matched Rules": ruleIds(source.classification?.matched_rules),
      "Noise Rules": ruleIds(source.classification?.noise_rules),
    };
  });
}

function buildAuditEvidenceCatalogueRows(journeyMap) {
  const steps = allSteps(journeyMap);
  const selectedLinks = steps.flatMap((step) => step.selected_links || []);
  const discoveredLinks = steps.flatMap((step) => step.discovered_links || []);
  const networkHosts = uniqueFlatMap(
    steps,
    (step) => step.tracking_signals?.network_hosts || [],
  );
  const scriptSources = uniqueFlatMap(
    steps,
    (step) => step.tracking_signals?.script_sources || [],
  );
  const dataLayerEvents = uniqueFlatMap(
    steps,
    (step) => step.tracking_signals?.data_layer_events || [],
  );
  const stepNotes = steps.flatMap((step) => step.notes || []);
  const stepErrors = steps.filter((step) => step.error?.message);

  return [
    evidenceRow("Journeys", (journeyMap.journeys || []).length),
    evidenceRow("Journey Steps", steps.length),
    evidenceRow("Visited Steps", steps.filter((step) => step.status === "visited").length),
    evidenceRow("Failed Steps", steps.filter((step) => step.status === "failed").length),
    evidenceRow("Skipped Steps", steps.filter((step) => step.status === "skipped").length),
    evidenceRow("Screenshots Referenced", countScreenshots(journeyMap)),
    evidenceRow("Selected Links", selectedLinks.length),
    evidenceRow("Discovered Links", discoveredLinks.length),
    evidenceRow("Consent Platforms Observed", (journeyMap.consent?.platforms_observed || []).length),
    evidenceRow("Pre-Consent Hosts", (journeyMap.consent?.pre_consent?.network_hosts || []).length),
    evidenceRow("Post-Consent Hosts", (journeyMap.consent?.post_consent?.network_hosts || []).length),
    evidenceRow("Unique Network Hosts Across Steps", networkHosts.length),
    evidenceRow("Unique Script Sources Across Steps", scriptSources.length),
    evidenceRow("Unique Data Layer Events Across Steps", dataLayerEvents.length),
    evidenceRow("Limits", (journeyMap.limits || []).length),
    evidenceRow("Discovery Notes", (journeyMap.discovery_status?.notes || []).length),
    evidenceRow("Step Notes", stepNotes.length),
    evidenceRow("Step Errors", stepErrors.length),
  ];
}

function buildLimitNoteRows(journeyMap) {
  const rows = [];

  for (const limit of journeyMap.limits || []) {
    rows.push({
      Type: "limit",
      Code: limit.code,
      Message: limit.message,
      Impact: limit.impact,
      "Journey ID": "",
      "Step Index": "",
      URL: "",
    });
  }

  for (const note of journeyMap.discovery_status?.notes || []) {
    rows.push(noteRow("discovery_note", "DISCOVERY_NOTE", note));
  }

  for (const note of journeyMap.consent?.notes || []) {
    rows.push(noteRow("consent_note", "CONSENT_NOTE", note));
  }

  for (const { journey, step } of journeyStepPairs(journeyMap)) {
    for (const note of step.notes || []) {
      rows.push(noteRow("step_note", "STEP_NOTE", note, journey, step));
    }
    if (step.error?.message) {
      rows.push(noteRow("step_error", "STEP_ERROR", step.error.message, journey, step));
    }
  }

  return rows;
}

function appendConsentSnapshotRows(rows, section, snapshot = {}) {
  rows.push(consentRow(section, "Network Hosts", joinValues(snapshot.network_hosts)));
  rows.push(consentRow(section, "Network URL Sample", joinValues(snapshot.network_urls_sample)));
  rows.push(consentRow(section, "Cookies", cookieSummary(snapshot.cookies)));
  rows.push(consentRow(section, "Cookies Count", snapshot.cookies_count));
  rows.push(consentRow(section, "Data Layer Events", joinValues(snapshot.data_layer_events)));
  rows.push(consentRow(section, "Script Sources", joinValues(snapshot.script_sources)));

  const params = snapshot.google_consent_params || {};
  for (const [key, value] of Object.entries(params)) {
    rows.push(consentRow(section, `Google Consent Param: ${key}`, joinValues(value)));
  }
}

function allSteps(journeyMap) {
  return journeyStepPairs(journeyMap).map(({ step }) => step);
}

function journeyStepPairs(journeyMap) {
  const pairs = [];
  for (const journey of journeyMap.journeys || []) {
    for (const step of journey.steps || []) {
      pairs.push({ journey, step });
    }
  }
  return pairs;
}

function countScreenshots(journeyMap) {
  return allSteps(journeyMap).filter((step) => Boolean(step.screenshot)).length;
}

function fieldRow(field, value) {
  return { Field: field, Value: flattenValue(value) };
}

function consentRow(section, field, value) {
  return { Section: section, Field: field, Value: flattenValue(value) };
}

function evidenceRow(type, count, notes = "") {
  return { "Evidence Type": type, Count: count, Notes: notes };
}

function noteRow(type, code, message, journey = {}, step = {}) {
  return {
    Type: type,
    Code: code,
    Message: message,
    Impact: "",
    "Journey ID": journey.journey_id || "",
    "Step Index": step.step_index || "",
    URL: step.url || "",
  };
}

function stepLabel(step) {
  if (step.step_index === 1) return "homepage";
  return step.source_selected_link?.text || step.title || `step-${step.step_index}`;
}

function ruleIds(rules) {
  return joinValues((rules || []).map((rule) => rule.rule_id).filter(Boolean));
}

function matchedTerms(rules) {
  const terms = [];
  for (const rule of rules || []) {
    for (const match of rule.matches || []) {
      terms.push(`${rule.rule_id}:${match.term || match.value || match.matched}`);
    }
  }
  return joinValues(terms);
}

function cookieSummary(cookies) {
  return joinValues(
    (cookies || []).map((cookie) => [cookie.name, cookie.domain].filter(Boolean).join("@")),
  );
}

function joinValues(values) {
  if (!Array.isArray(values)) return flattenValue(values);
  return values.map(flattenValue).filter(Boolean).join("; ");
}

function flattenValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return value;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return joinValues(value);
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${labelFromKey(key)}: ${flattenValue(item)}`)
      .filter(Boolean)
      .join("; ");
  }
  return String(value);
}

function labelFromKey(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeRow(row, columns) {
  const normalized = {};
  for (const column of columns) normalized[column] = flattenValue(row[column]);
  return normalized;
}

function emptyRow(columns) {
  return Object.fromEntries(columns.map((column) => [column, ""]));
}

function widthForColumn(column) {
  if (/url|path|source|rules|hosts|scripts|notes|message|impact/i.test(column)) {
    return 45;
  }
  if (/title|label|profile/i.test(column)) return 28;
  return 18;
}

function uniqueFlatMap(items, mapper) {
  return [...new Set(items.flatMap(mapper).filter(Boolean))].sort();
}

module.exports = {
  SHEET_DEFINITIONS,
  allSteps,
  buildAuditEvidenceCatalogueRows,
  buildConsentReviewRows,
  buildDiscoveryStatusRows,
  buildJourneyStepRows,
  buildLimitNoteRows,
  buildScreenshotRegistryRows,
  buildSelectedLinkRows,
  buildSiteProfileRows,
  buildTechnologyNetworkRows,
  countScreenshots,
  fieldRow,
  joinValues,
  rowsToSheet,
};
