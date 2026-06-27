const PAGE_TYPE_RULES = [
  { pageType: "homepage", patterns: [/^\/$/] },
  { pageType: "study", patterns: [/\bstudy\b/i, /\bundergraduate\b/i, /\bpostgraduate\b/i] },
  { pageType: "apply", patterns: [/\bapply\b/i, /\badmission/i, /\benquire\b/i] },
  { pageType: "course_search", patterns: [/\bcourse/i, /\bprogram/i, /\bdegree/i] },
  { pageType: "research", patterns: [/\bresearch\b/i] },
  { pageType: "faculty", patterns: [/\bfacult/i, /\bschool\b/i, /\bdepartment\b/i] },
  { pageType: "news", patterns: [/\bnews\b/i, /\bmedia\b/i, /\bpress\b/i, /\barticle/i] },
  { pageType: "event", patterns: [/\bevent/i, /\bwebinar/i, /\bseminar/i] },
  { pageType: "alumni", patterns: [/\balumni\b/i] },
  { pageType: "giving", patterns: [/\bgiving\b/i, /\bdonate\b/i, /\bsupport-us\b/i] },
  { pageType: "contact", patterns: [/\bcontact\b/i, /\blocation/i, /\bvisit-us\b/i] },
  { pageType: "portal", patterns: [/\bportal\b/i, /\blogin\b/i, /\bsign-?in\b/i, /\baccount\b/i] },
  { pageType: "policy", patterns: [/\bprivacy\b/i, /\bterms\b/i, /\bpolicy\b/i, /\bcookie\b/i, /\baccessibility\b/i] },
  { pageType: "support", patterns: [/\bsupport\b/i, /\bhelp\b/i, /\bfaq\b/i] },
  { pageType: "product", patterns: [/\bproduct\b/i, /\bitem\b/i, /\bshop\//i] },
  { pageType: "category", patterns: [/\bcategory\b/i, /\bcollections?\b/i, /\bshop\b/i] },
  { pageType: "blog", patterns: [/\bblog\b/i, /\binsights?\b/i, /\bstories\b/i] },
];

function classifyUrl(candidate = {}) {
  const url = candidate.url || "";
  const text = candidate.text || "";
  const host = candidate.host || "";
  let pathname = "/";

  try {
    pathname = new URL(url).pathname || "/";
  } catch {}

  const haystack = `${host} ${pathname} ${text}`;
  for (const rule of PAGE_TYPE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return rule.pageType;
    }
  }

  return "unknown";
}

module.exports = {
  PAGE_TYPE_RULES,
  classifyUrl,
};
