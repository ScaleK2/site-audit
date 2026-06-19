const JOURNEY_PATTERNS = {
  ecommerce: [
    pattern(
      "ecommerce-product-purchase",
      "Product purchase",
      "purchase",
      "high",
      [
        stage("category_or_listing", [
          "shop",
          "category",
          "collection",
          "products",
          "store",
        ]),
        stage("product_or_detail", ["product", "item", "details", "view"]),
        stage("cart_or_checkout", ["cart", "basket", "bag", "checkout"]),
      ],
    ),
  ],
  lead_generation: [
    pattern(
      "lead-generation-contact",
      "Lead generation / Contact",
      "lead_capture",
      "high",
      [
        stage("service_or_solution", [
          "service",
          "services",
          "solution",
          "solutions",
        ]),
        stage("proof_or_detail", [
          "case study",
          "case studies",
          "work",
          "clients",
        ]),
        stage("contact_or_enquiry", [
          "contact",
          "enquire",
          "enquiry",
          "quote",
          "book",
          "consultation",
        ]),
      ],
    ),
  ],
  standard_business: [
    pattern(
      "standard-business-contact",
      "Business information / Contact",
      "contact",
      "medium",
      [
        stage("about_or_services", ["about", "services", "solutions", "team"]),
        stage("contact", ["contact", "locations", "office"]),
      ],
    ),
  ],
  blog_or_publisher: [
    pattern(
      "publisher-content-engagement",
      "Content engagement",
      "content_engagement",
      "medium",
      [
        stage("topic_or_category", [
          "blog",
          "news",
          "articles",
          "insights",
          "category",
          "topic",
        ]),
        stage("subscribe", ["subscribe", "newsletter"]),
      ],
    ),
  ],
  education: [
    pattern(
      "education-study-application",
      "Study / Application",
      "application",
      "high",
      [
        stage("study", ["study", "course", "courses", "degree", "program"]),
        stage("audience", [
          "undergraduate",
          "postgraduate",
          "international",
          "students",
        ]),
        stage("apply_or_enquire", [
          "apply",
          "admission",
          "admissions",
          "enquire",
          "enquiry",
        ]),
      ],
    ),
  ],
  saas_or_app: [
    pattern(
      "saas-demo-or-signup",
      "Product / Demo / Signup",
      "demo_or_signup",
      "high",
      [
        stage("product_or_features", [
          "product",
          "features",
          "platform",
          "integrations",
        ]),
        stage("pricing_or_demo", [
          "pricing",
          "demo",
          "trial",
          "sign up",
          "signup",
          "get started",
        ]),
      ],
    ),
  ],
  marketplace_or_directory: [
    pattern(
      "marketplace-search-to-booking",
      "Search / Listing / Booking",
      "booking",
      "high",
      [
        stage("search_or_category", [
          "search",
          "find",
          "browse",
          "directory",
          "category",
        ]),
        stage("listing_or_detail", ["listing", "provider", "venue", "profile"]),
        stage("booking_or_enquiry", ["book", "booking", "enquire", "contact"]),
      ],
    ),
  ],
  nonprofit_or_government: [
    pattern(
      "nonprofit-government-service-apply",
      "Service / Apply / Contact",
      "application",
      "high",
      [
        stage("program_or_service", [
          "program",
          "services",
          "grants",
          "support",
        ]),
        stage("eligibility_or_apply", [
          "eligibility",
          "apply",
          "forms",
          "permits",
        ]),
        stage("donate_or_contact", ["donate", "volunteer", "contact"]),
      ],
    ),
  ],
  unknown: [
    pattern(
      "generic-discovery-contact",
      "Discovery / Contact",
      "research_or_consideration",
      "medium",
      [
        stage("information", ["about", "services", "learn", "resources"]),
        stage("contact", ["contact", "enquire", "support"]),
      ],
    ),
  ],
};

function pattern(id, label, category, priority, stages) {
  return { id, label, category, priority, stages };
}

function stage(id, keywords) {
  return { id, keywords };
}

module.exports = {
  JOURNEY_PATTERNS,
};
