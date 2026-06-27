const {
  ACCEPT_TEXTS,
  BLOCKED_ACCEPT_TEXTS,
  CONSENT_PLATFORMS,
} = require("../config/consent-platforms");
const { uniqueHosts } = require("./network-recorder");

const GOOGLE_CONSENT_PARAM_KEYS = [
  "gcs",
  "gcd",
  "dma",
  "dma_cps",
  "npa",
  "ads_data_redaction",
  "url_passthrough",
];

async function initialiseConsent({
  page,
  context,
  networkRecorder,
  options = {},
}) {
  const notes = [];
  const preConsent = await captureConsentState({
    page,
    context,
    networkRecorder,
  });
  const platformsObserved = detectConsentPlatforms(preConsent);
  const indicatorsObserved =
    platformsObserved.length > 0 || preConsent.dom_indicators.length > 0;

  let acceptAction = {
    attempted: false,
    matched_text: "",
    selector_strategy: "",
    status: "not_found",
  };
  let status = indicatorsObserved
    ? "no_accept_action_detected"
    : "not_observed";

  if (indicatorsObserved) {
    const candidate = await findAcceptCandidate(page);
    if (candidate) {
      networkRecorder.reset();
      acceptAction = {
        attempted: true,
        matched_text: candidate.text,
        selector_strategy: candidate.selector_strategy,
        status: "failed",
      };

      try {
        await page
          .locator(candidate.selector)
          .nth(candidate.index)
          .click({ timeout: options.acceptClickTimeoutMs || 5_000 });
        await page.waitForTimeout(options.postConsentWaitMs || 1_500);
        await page
          .waitForLoadState("networkidle", {
            timeout: options.networkIdleTimeoutMs || 5_000,
          })
          .catch(() => {});
        acceptAction.status = "clicked";
        status = "accepted";
      } catch (error) {
        acceptAction.status = "failed";
        status = "accept_failed";
        notes.push(`Consent accept click failed: ${error?.message || error}`);
      }
    } else {
      notes.push(
        "Consent indicators were observed, but no clear accept action was detected.",
      );
    }
  } else {
    notes.push(
      "No visible or technical consent indicators were observed on initial homepage load.",
    );
  }

  const postConsent = await captureConsentState({
    page,
    context,
    networkRecorder,
  });
  const allPlatformsObserved = mergePlatforms(
    platformsObserved,
    detectConsentPlatforms(postConsent),
  );

  return {
    status,
    platforms_observed: allPlatformsObserved,
    accept_action: acceptAction,
    pre_consent: publicConsentState(preConsent),
    post_consent: publicConsentState(postConsent),
    state_changes: consentStateChanges(preConsent, postConsent),
    notes,
  };
}

async function captureConsentState({ page, context, networkRecorder }) {
  const networkUrls = networkRecorder.urls();
  const [cookies, domState] = await Promise.all([
    context.cookies().catch(() => []),
    captureDomConsentState(page),
  ]);

  const scripts = domState.script_sources || [];

  return {
    network_hosts: uniqueHosts(networkUrls),
    network_urls_sample: networkUrls.slice(0, 200),
    cookies: cookies.map(normaliseCookie).sort(compareCookies),
    cookies_count: cookies.length,
    data_layer_events: domState.data_layer_events || [],
    script_sources: scripts,
    google_consent_params: extractGoogleConsentParams(networkUrls),
    dom_indicators: domState.dom_indicators || [],
    window_objects: domState.window_objects || [],
  };
}

async function captureDomConsentState(page) {
  return page
    .evaluate(() => {
      const script_sources = [...document.scripts]
        .map((script) => script.src)
        .filter(Boolean)
        .sort();
      const dataLayer = window.dataLayer;
      const data_layer_events = Array.isArray(dataLayer)
        ? [
            ...new Set(
              dataLayer
                .map((item) => item && item.event)
                .filter(Boolean)
                .map(String),
            ),
          ].sort()
        : [];

      const indicatorSelectors = [
        "[id*='consent' i]",
        "[class*='consent' i]",
        "[id*='cookie' i]",
        "[class*='cookie' i]",
        "[id*='cmp' i]",
        "[class*='cmp' i]",
        "[id*='onetrust' i]",
        "[class*='onetrust' i]",
        "[id*='ot-sdk' i]",
        "[class*='ot-sdk' i]",
        "[role='dialog']",
      ];

      const dom_indicators = [];
      for (const selector of indicatorSelectors) {
        for (const el of [...document.querySelectorAll(selector)].slice(
          0,
          20,
        )) {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const visible =
            style &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0;
          const text = (
            el.innerText ||
            el.getAttribute("aria-label") ||
            el.id ||
            el.className ||
            ""
          )
            .toString()
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 200);
          if (
            visible &&
            /cookie|consent|privacy|preferences|onetrust|cmp/i.test(
              `${selector} ${text}`,
            )
          ) {
            dom_indicators.push({ selector, text });
          }
        }
      }

      const knownWindowObjects = [
        "OneTrust",
        "Optanon",
        "Cookiebot",
        "UC_UI",
        "Didomi",
        "__tcfapi",
        "__cmp",
        "CookieControl",
        "Osano",
      ];
      const window_objects = knownWindowObjects
        .filter((key) => window[key] !== undefined)
        .sort();

      return {
        data_layer_events,
        dom_indicators,
        script_sources,
        window_objects,
      };
    })
    .catch(() => ({
      data_layer_events: [],
      dom_indicators: [],
      script_sources: [],
      window_objects: [],
    }));
}

async function findAcceptCandidate(page) {
  const candidates = await page
    .locator(
      "button, [role='button'], input[type='button'], input[type='submit'], a",
    )
    .evaluateAll(
      (elements, payload) => {
        const acceptTexts = payload.acceptTexts;
        const blockedTexts = payload.blockedTexts;
        const normalise = (value) =>
          String(value || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
        const out = [];

        elements.forEach((el, index) => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const visible =
            style &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            rect.height > 0;
          if (!visible) return;

          const text = normalise(
            el.innerText ||
              el.value ||
              el.getAttribute("aria-label") ||
              el.getAttribute("title") ||
              "",
          );
          if (!text) return;
          if (blockedTexts.some((blocked) => text.includes(blocked))) return;

          const exact = acceptTexts.find((candidate) => text === candidate);
          const startsWith = acceptTexts.find(
            (candidate) =>
              text.startsWith(candidate) &&
              text.length <= candidate.length + 12,
          );
          const matched = exact || startsWith;
          if (!matched) return;

          out.push({ index, text, matched });
        });

        return out;
      },
      { acceptTexts: ACCEPT_TEXTS, blockedTexts: BLOCKED_ACCEPT_TEXTS },
    )
    .catch(() => []);

  const candidate = candidates.sort(
    (a, b) =>
      ACCEPT_TEXTS.indexOf(a.matched) - ACCEPT_TEXTS.indexOf(b.matched) ||
      a.index - b.index,
  )[0];
  if (!candidate) return null;

  return {
    selector:
      "button, [role='button'], input[type='button'], input[type='submit'], a",
    selector_strategy: "clear_accept_text",
    index: candidate.index,
    text: candidate.text,
  };
}

function extractGoogleConsentParams(urls) {
  const values = Object.fromEntries(
    GOOGLE_CONSENT_PARAM_KEYS.map((key) => [key, new Set()]),
  );

  for (const raw of urls || []) {
    try {
      const url = new URL(raw);
      for (const key of GOOGLE_CONSENT_PARAM_KEYS) {
        const value = url.searchParams.get(key);
        if (value !== null && value !== "") values[key].add(value);
      }
    } catch {}
  }

  return Object.fromEntries(
    Object.entries(values).map(([key, set]) => [key, [...set].sort()]),
  );
}

function detectConsentPlatforms(state) {
  const evidenceText = [
    ...(state.network_hosts || []),
    ...(state.network_urls_sample || []),
    ...(state.script_sources || []),
    ...(state.cookies || []).map((cookie) => cookie.name),
    ...(state.dom_indicators || []).map(
      (indicator) => `${indicator.selector} ${indicator.text}`,
    ),
    ...(state.window_objects || []),
    ...(state.data_layer_events || []),
  ]
    .join(" ")
    .toLowerCase();

  return CONSENT_PLATFORMS.map((platform) => {
    const matched = [];
    for (const [hintType, hints] of Object.entries({
      host: platform.hostHints,
      script: platform.scriptHints,
      dom: platform.domHints,
      cookie: platform.cookieHints,
      window: platform.windowHints,
    })) {
      for (const hint of hints || []) {
        if (hint && evidenceText.includes(String(hint).toLowerCase()))
          matched.push(`${hintType}:${hint}`);
      }
    }

    return matched.length
      ? {
          id: platform.id,
          label: platform.label,
          matched_evidence: [...new Set(matched)].sort(),
        }
      : null;
  }).filter(Boolean);
}

function consentStateChanges(pre, post) {
  return {
    new_hosts_after_accept: difference(post.network_hosts, pre.network_hosts),
    removed_hosts_after_accept: difference(
      pre.network_hosts,
      post.network_hosts,
    ),
    new_cookies_after_accept: difference(
      (post.cookies || []).map(cookieKey),
      (pre.cookies || []).map(cookieKey),
    ),
    new_data_layer_events_after_accept: difference(
      post.data_layer_events,
      pre.data_layer_events,
    ),
    new_script_sources_after_accept: difference(
      post.script_sources,
      pre.script_sources,
    ),
    changed_google_consent_params: changedConsentParamKeys(
      pre.google_consent_params,
      post.google_consent_params,
    ),
  };
}

function changedConsentParamKeys(preParams, postParams) {
  return GOOGLE_CONSENT_PARAM_KEYS.filter(
    (key) =>
      JSON.stringify(preParams?.[key] || []) !==
      JSON.stringify(postParams?.[key] || []),
  );
}

function difference(after, before) {
  const beforeSet = new Set(before || []);
  return [...new Set(after || [])]
    .filter((value) => !beforeSet.has(value))
    .sort();
}

function mergePlatforms(a, b) {
  const byId = new Map();
  for (const platform of [...(a || []), ...(b || [])]) {
    const existing = byId.get(platform.id);
    if (!existing) {
      byId.set(platform.id, platform);
    } else {
      existing.matched_evidence = [
        ...new Set([
          ...(existing.matched_evidence || []),
          ...(platform.matched_evidence || []),
        ]),
      ].sort();
    }
  }
  return [...byId.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function publicConsentState(state) {
  return {
    network_hosts: state.network_hosts,
    network_urls_sample: state.network_urls_sample,
    cookies: state.cookies,
    cookies_count: state.cookies_count,
    data_layer_events: state.data_layer_events,
    script_sources: state.script_sources,
    google_consent_params: state.google_consent_params,
  };
}

function normaliseCookie(cookie) {
  return {
    name: cookie.name,
    domain: cookie.domain,
    path: cookie.path,
  };
}

function compareCookies(a, b) {
  return cookieKey(a).localeCompare(cookieKey(b));
}

function cookieKey(cookie) {
  return `${cookie.domain || ""}|${cookie.path || ""}|${cookie.name || ""}`;
}

module.exports = {
  captureConsentState,
  consentStateChanges,
  initialiseConsent,
};
