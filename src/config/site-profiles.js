const SITE_PROFILES = {
  ecommerce: {
    label: "Ecommerce",
    minScore: 10,
    mediumConfidenceScore: 18,
    highConfidenceScore: 30,
    rules: [
      rule(
        "ecommerce_cart_or_checkout",
        12,
        ["url", "text", "page"],
        ["cart", "basket", "bag", "checkout"],
      ),
      rule(
        "ecommerce_product_paths",
        10,
        ["url"],
        [
          "/product",
          "/products",
          "/collections",
          "/category",
          "/shop",
          "/store",
        ],
      ),
      rule(
        "ecommerce_shop_intent",
        8,
        ["url", "text", "page"],
        ["shop", "buy", "sale", "deals", "product"],
      ),
      rule("ecommerce_cart_signal", 8, ["pageSignal"], ["has_cart_link"]),
    ],
  },
  lead_generation: {
    label: "Lead generation",
    minScore: 8,
    mediumConfidenceScore: 16,
    highConfidenceScore: 28,
    rules: [
      rule(
        "lead_contact_intent",
        10,
        ["url", "text", "page"],
        ["contact", "enquire", "enquiry", "quote", "consultation"],
      ),
      rule(
        "lead_demo_or_request_intent",
        8,
        ["url", "text", "page"],
        [
          "demo",
          "request",
          "book",
          "appointment",
          "call",
          "apply",
          "register interest",
          "book inspection",
        ],
      ),
      rule("lead_form_signal", 6, ["pageSignal"], ["has_forms"]),
      rule(
        "lead_service_paths",
        6,
        ["url"],
        [
          "/services",
          "/solutions",
          "/contact",
          "/enquiry",
          "/quote",
          "/apply",
          "/developments",
          "/apartments",
          "/property",
        ],
      ),
    ],
  },
  standard_business: {
    label: "Standard business",
    minScore: 10,
    mediumConfidenceScore: 18,
    highConfidenceScore: 28,
    rules: [
      rule(
        "business_about_or_services",
        8,
        ["url", "text", "page"],
        ["about", "services", "solutions", "what we do"],
      ),
      rule(
        "business_proof",
        6,
        ["url", "text", "page"],
        ["case study", "case studies", "testimonials", "clients", "work"],
      ),
      rule(
        "business_contact",
        6,
        ["url", "text", "page"],
        ["contact", "team", "locations"],
      ),
    ],
  },
  blog_or_publisher: {
    label: "Blog or publisher",
    minScore: 8,
    mediumConfidenceScore: 16,
    highConfidenceScore: 26,
    rules: [
      rule(
        "publisher_article_paths",
        10,
        ["url"],
        ["/blog", "/blogs", "/news", "/articles", "/insights", "/posts"],
      ),
      rule(
        "publisher_topic_paths",
        6,
        ["url", "text"],
        ["category", "tag", "topic", "author"],
      ),
      rule(
        "publisher_subscribe_intent",
        6,
        ["url", "text", "page"],
        ["subscribe", "newsletter", "latest news"],
      ),
    ],
  },
  education: {
    label: "Education",
    minScore: 10,
    mediumConfidenceScore: 18,
    highConfidenceScore: 28,
    rules: [
      rule(
        "education_study_paths",
        12,
        ["url", "text", "page"],
        ["study", "course", "courses", "degree", "program", "programs"],
      ),
      rule(
        "education_audience_paths",
        8,
        ["url", "text", "page"],
        [
          "undergraduate",
          "postgraduate",
          "international",
          "student",
          "students",
        ],
      ),
      rule(
        "education_application_intent",
        8,
        ["url", "text", "page"],
        ["apply", "admission", "admissions", "enquire", "enquiry"],
      ),
      rule(
        "education_finance_or_support",
        5,
        ["url", "text", "page"],
        ["fees", "scholarship", "scholarships", "campus"],
      ),
    ],
  },
  saas_or_app: {
    label: "SaaS or app",
    minScore: 10,
    mediumConfidenceScore: 18,
    highConfidenceScore: 28,
    rules: [
      rule(
        "saas_product_paths",
        8,
        ["url", "text", "page"],
        ["features", "platform", "product", "integrations"],
      ),
      rule(
        "saas_pricing_or_demo",
        10,
        ["url", "text", "page"],
        ["pricing", "demo", "trial", "sign up", "signup", "get started"],
      ),
      rule(
        "saas_docs_or_login",
        5,
        ["url", "text"],
        ["docs", "developers", "login", "app"],
      ),
    ],
  },
  marketplace_or_directory: {
    label: "Marketplace or directory",
    minScore: 10,
    mediumConfidenceScore: 18,
    highConfidenceScore: 28,
    rules: [
      rule(
        "marketplace_listing_paths",
        10,
        ["url", "text", "page"],
        ["listing", "listings", "directory", "providers", "venues"],
      ),
      rule(
        "marketplace_search_or_filter",
        8,
        ["url", "text", "page"],
        ["search", "find", "browse", "filter", "location"],
      ),
      rule(
        "marketplace_booking_intent",
        7,
        ["url", "text", "page"],
        ["book", "booking", "reserve", "availability"],
      ),
      rule("marketplace_search_signal", 5, ["pageSignal"], ["has_search"]),
    ],
  },
  nonprofit_or_government: {
    label: "Nonprofit or government",
    minScore: 10,
    mediumConfidenceScore: 18,
    highConfidenceScore: 28,
    rules: [
      rule(
        "nonprofit_government_programs",
        8,
        ["url", "text", "page"],
        ["program", "programs", "services", "grants", "community"],
      ),
      rule(
        "nonprofit_government_apply",
        8,
        ["url", "text", "page"],
        ["apply", "eligibility", "forms", "permits", "support"],
      ),
      rule(
        "nonprofit_donate_or_volunteer",
        7,
        ["url", "text", "page"],
        ["donate", "volunteer", "fundraising"],
      ),
      rule(
        "government_publication_paths",
        5,
        ["url", "text"],
        ["publications", "reports", "policies"],
      ),
    ],
  },
};

function rule(id, weight, fields, terms) {
  return { id, weight, fields, terms };
}

module.exports = {
  SITE_PROFILES,
};
