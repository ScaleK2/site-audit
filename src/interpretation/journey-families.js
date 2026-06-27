const {
  compactUrl,
  discoveryUrls,
  joinList,
  labelForUrl,
  normalizeUrl,
  selectedLinks,
  successfulStepUrls,
  titleCase,
  uniqueBy,
  visitedSteps,
} = require("./evidence-utils");

const FAMILY_RULES = {
  education: [
    family("Domestic Study", ["study", "undergraduate", "domestic", "degrees", "courses", "course"]),
    family("International Study", ["international", "international students", "study in"]),
    family("Admissions / Apply", ["apply", "admission", "how to apply", "application"]),
    family("Fees & Scholarships", ["fees", "scholarship", "cost", "tuition"]),
    family("Research", ["research", "research areas", "centres", "centers"]),
    family("Student Support", ["student support", "student", "support", "services"]),
    family("Alumni", ["alumni"]),
    family("Events", ["event", "events"]),
    family("Agent / Adviser", ["agent", "adviser", "advisor"]),
    family("Library / Services", ["library", "libraries"]),
  ],
  ecommerce: [
    family("Browse / Category", ["category", "categories", "collections", "shop", "browse"]),
    family("Product Detail", ["product", "products", "pdp", "sku"]),
    family("Cart / Checkout", ["cart", "checkout", "basket", "bag"]),
    family("Offers / Promotions", ["sale", "offer", "promotion", "promo", "deals"]),
    family("Store / Location", ["store", "stores", "location", "locations"]),
    family("Support / Returns", ["returns", "support", "help", "delivery", "shipping"]),
  ],
  lead_generation: [
    family("Services", ["services", "solutions"]),
    family("Proof / Case Studies", ["case studies", "case-study", "results", "work", "testimonials"]),
    family("Contact / Enquiry", ["contact", "enquire", "enquiry", "inquiry"]),
    family("Quote / Booking", ["quote", "book", "booking", "appointment"]),
    family("Locations", ["locations", "areas", "near me"]),
    family("Support", ["support", "help"]),
  ],
  property_lead_generation: [
    family("Developments / Communities", ["developments", "communities", "property", "apartments", "homes"]),
    family("Contact / Enquiry", ["contact", "enquire", "enquiry", "register"]),
    family("Book / Inspect", ["book", "inspection", "appointment", "visit"]),
    family("Locations", ["locations", "suburb", "community"]),
    family("Plans / Pricing", ["plans", "pricing", "floorplans", "prices"]),
    family("Support", ["support", "help"]),
  ],
  insurance: [
    family("Products", ["insurance", "cover", "policy", "products"]),
    family("Quote / Apply", ["quote", "apply", "get started", "buy"]),
    family("Claims", ["claims", "claim"]),
    family("Support", ["support", "help"]),
    family("Contact", ["contact"]),
    family("Disclosure / PDS", ["pds", "product disclosure statement", "fsg", "financial services guide"]),
  ],
  finance: [
    family("Products", ["loans", "accounts", "cards", "products", "finance"]),
    family("Quote / Apply", ["quote", "apply", "application", "get started"]),
    family("Support", ["support", "help"]),
    family("Contact", ["contact"]),
    family("Disclosure / PDS", ["pds", "product disclosure statement", "fsg", "financial services guide"]),
  ],
  general: [
    family("Product / Service", ["product", "service", "solution"]),
    family("Contact / Enquiry", ["contact", "enquire", "quote", "book"]),
    family("Support / Help", ["support", "help", "faq"]),
    family("About / Trust", ["about", "team", "case", "testimonial"]),
    family("Content / News", ["news", "blog", "article", "insight"]),
  ],
};

function buildJourneyFamilies(journeyMap, siteDiscovery) {
  const profile = journeyMap?.site_profile?.primary_profile || "general";
  const subProfile = journeyMap?.site_profile?.sub_profile || "";
  const rules = rulesForProfile(profile, subProfile);
  const visitedEvidence = buildVisitedEvidence(journeyMap);
  const discoveredEvidence = buildDiscoveredEvidence(journeyMap, siteDiscovery);

  return rules.map((rule) => {
    const visitedMatches = visitedEvidence.filter((item) => matchesRule(item, rule));
    const discoveredMatches = discoveredEvidence.filter((item) => matchesRule(item, rule));
    const status = visitedMatches.length
      ? "Validated"
      : discoveredMatches.length
        ? "Discovered only"
        : "Not observed";
    const evidence = visitedMatches.length ? visitedMatches : discoveredMatches;

    return {
      family: rule.name,
      status,
      observation: observationForFamily(rule.name, status, visitedMatches),
      evidence: evidence.map((item) => item.label || compactUrl(item.url)).filter(Boolean),
      urls: evidence.map((item) => item.url).filter(Boolean),
      narrative: narrativeForMatches(visitedMatches),
    };
  });
}

function rulesForProfile(profile, subProfile) {
  const key = String(subProfile || profile || "general").toLowerCase();
  if (FAMILY_RULES[key]) return FAMILY_RULES[key];
  const primaryKey = String(profile || "general").toLowerCase();
  return FAMILY_RULES[primaryKey] || FAMILY_RULES.general;
}

function buildVisitedEvidence(journeyMap) {
  const steps = visitedSteps(journeyMap).map((step) => ({
    url: step.final_url || step.url,
    label: step.title || step.source_selected_link?.text || labelForUrl(step.final_url || step.url),
    text: [
      step.title,
      step.url,
      step.final_url,
      step.source_selected_link?.text,
      step.source_selected_link?.page_type,
      step.source_selected_link?.classification?.categories?.join(" "),
      step.source_selected_link?.classification?.stages?.join(" "),
    ].filter(Boolean).join(" "),
  }));
  return uniqueBy(steps, (item) => normalizeUrl(item.url));
}

function buildDiscoveredEvidence(journeyMap, siteDiscovery) {
  const fromDiscovery = discoveryUrls(siteDiscovery).map((candidate) => ({
    url: candidate.url,
    label: candidate.text || candidate.title || candidate.page_type || labelForUrl(candidate.url),
    text: [
      candidate.url,
      candidate.text,
      candidate.title,
      candidate.page_type,
      candidate.selection_reason,
      (candidate.sources || []).join(" "),
    ].filter(Boolean).join(" "),
  }));

  const fromSelected = selectedLinks(journeyMap).map((link) => ({
    url: link.url,
    label: link.text || link.page_type || labelForUrl(link.url),
    text: [
      link.url,
      link.text,
      link.page_type,
      link.selection_reason,
      link.classification?.categories?.join(" "),
      link.classification?.stages?.join(" "),
    ].filter(Boolean).join(" "),
  }));

  return uniqueBy([...fromDiscovery, ...fromSelected], (item) => normalizeUrl(item.url));
}

function family(name, terms) {
  return { name, terms };
}

function matchesRule(item, rule) {
  const haystack = String(item.text || "").toLowerCase();
  return rule.terms.some((term) => haystack.includes(term.toLowerCase()));
}

function observationForFamily(name, status, visitedMatches) {
  if (status === "Validated") {
    const narrative = narrativeForMatches(visitedMatches);
    return narrative
      ? `Representative journey observed: ${narrative}.`
      : `${name} was represented in visited journey steps.`;
  }
  if (status === "Discovered only") {
    return `${name} was discovered but not represented in visited journey steps.`;
  }
  return `${name} was not observed in discovered or visited evidence for this audit.`;
}

function narrativeForMatches(matches) {
  if (!matches.length) return "";
  const labels = ["Homepage", ...matches.map((item) => titleCase(item.label || labelForUrl(item.url)))];
  return [...new Set(labels)].slice(0, 6).join(" → ");
}

function summarizeCoverage(journeyFamilies, journeyMap, siteDiscovery) {
  const validated = journeyFamilies.filter((item) => item.status === "Validated");
  const discoveredOnly = journeyFamilies.filter((item) => item.status === "Discovered only");
  const discovered = journeyFamilies.filter((item) => item.status !== "Not observed");
  const visitedHosts = uniqueHosts(successfulStepUrls(journeyMap));
  const discoveredHosts = uniqueHosts(discoveryUrls(siteDiscovery).map((item) => item.url));
  const failedOrSkipped = (journeyMap?.journeys || [])
    .flatMap((journey) => journey.steps || [])
    .filter((step) => ["failed", "skipped"].includes(step.status)).length;

  let label = "Limited";
  if (discovered.length >= 5 && validated.length >= Math.ceil(discovered.length * 0.6) && failedOrSkipped <= 1) {
    label = "Strong";
  } else if (validated.length >= 2 || (discovered.length && validated.length >= Math.ceil(discovered.length * 0.35))) {
    label = "Moderate";
  }

  return {
    label,
    validated_count: validated.length,
    discovered_count: discovered.length,
    discovered_only_count: discoveredOnly.length,
    visited_domain_count: visitedHosts.length,
    discovered_domain_count: discoveredHosts.length,
    failed_or_skipped_count: failedOrSkipped,
    observation: `Coverage: ${label}. The audit validated ${validated.length} of ${discovered.length} discovered journey families and visited ${visitedHosts.length} of ${discoveredHosts.length || visitedHosts.length} discovered same-site domains.`,
    evidence: `Validated families: ${joinList(validated.map((item) => item.family))}; discovered only: ${joinList(discoveredOnly.map((item) => item.family))}`,
  };
}

function uniqueHosts(urls) {
  return [...new Set((urls || []).map((url) => {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch (_error) {
      return "";
    }
  }).filter(Boolean))].sort();
}

module.exports = {
  buildDiscoveredEvidence,
  buildJourneyFamilies,
  buildVisitedEvidence,
  summarizeCoverage,
};
