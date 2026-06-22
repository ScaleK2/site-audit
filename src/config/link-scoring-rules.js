const SUB_PROFILE_LINK_SCORING_RULES = {
  general_ecommerce: [
    scoringRule(
      "sub_profile:general_ecommerce:purchase_path",
      10,
      ["url", "text"],
      [
        "shop",
        "product",
        "products",
        "collection",
        "collections",
        "category",
        "cart",
        "basket",
        "checkout",
        "sale",
      ],
    ),
    scoringRule(
      "sub_profile:general_ecommerce:contact_lower_priority",
      -6,
      ["url", "text"],
      ["contact", "enquire", "enquiry", "quote", "book"],
      { when: "purchase_signal_available" },
    ),
    scoringRule(
      "sub_profile:general_ecommerce:disclosure_low_priority",
      -8,
      ["url", "text"],
      disclosureTerms(),
    ),
  ],
  general_lead_generation: [
    scoringRule(
      "sub_profile:general_lead_generation:lead_action",
      10,
      ["url", "text"],
      [
        "contact",
        "enquire",
        "enquiry",
        "quote",
        "book",
        "request",
        "consultation",
        "appointment",
      ],
    ),
    scoringRule(
      "sub_profile:general_lead_generation:service_context",
      5,
      ["url", "text"],
      ["services", "solutions", "case study", "case studies"],
    ),
  ],
  property_lead_generation: [
    scoringRule(
      "sub_profile:property_lead_generation:property_detail",
      10,
      ["url", "text"],
      [
        "apartment",
        "apartments",
        "residence",
        "residences",
        "floorplan",
        "floorplans",
        "masterplan",
        "display suite",
        "location",
        "availability",
      ],
    ),
    scoringRule(
      "sub_profile:property_lead_generation:lead_action",
      12,
      ["url", "text"],
      [
        "register interest",
        "enquire",
        "enquiry",
        "book inspection",
        "book appointment",
        "contact",
      ],
    ),
    scoringRule(
      "sub_profile:property_lead_generation:disclosure_low_priority",
      -8,
      ["url", "text"],
      disclosureTerms(),
    ),
  ],
  insurance: [
    scoringRule(
      "sub_profile:insurance:quote_or_claim",
      12,
      ["url", "text"],
      [
        "quote",
        "get a quote",
        "claim",
        "claims",
        "make a claim",
        "contact",
        "enquire",
      ],
    ),
    scoringRule(
      "sub_profile:insurance:product_context",
      8,
      ["url", "text"],
      ["insurance", "cover", "policy", "premium"],
    ),
    scoringRule(
      "sub_profile:insurance:disclosure_relevant",
      10,
      ["url", "text"],
      disclosureTerms(),
    ),
  ],
  finance: [
    scoringRule(
      "sub_profile:finance:application_or_calculator",
      12,
      ["url", "text"],
      [
        "apply",
        "loan",
        "mortgage",
        "rates",
        "calculator",
        "repayment",
        "quote",
        "contact",
        "enquire",
      ],
    ),
    scoringRule(
      "sub_profile:finance:product_context",
      8,
      ["url", "text"],
      ["finance", "investment", "superannuation", "wealth", "home loan"],
    ),
    scoringRule(
      "sub_profile:finance:disclosure_relevant",
      10,
      ["url", "text"],
      disclosureTerms(),
    ),
  ],
  education: [
    scoringRule(
      "sub_profile:education:study_path",
      10,
      ["url", "text"],
      [
        "study",
        "course",
        "courses",
        "degree",
        "undergraduate",
        "postgraduate",
        "international",
      ],
    ),
    scoringRule(
      "sub_profile:education:apply_or_enquire",
      8,
      ["url", "text"],
      ["apply", "admissions", "enquire", "enquiry"],
    ),
  ],
};

function disclosureTerms() {
  return [
    "pds",
    "fsg",
    "product disclosure statement",
    "financial services guide",
    "collection statement",
  ];
}

function scoringRule(id, weight, fields, terms, options = {}) {
  return { id, weight, fields, terms, ...options };
}

module.exports = {
  SUB_PROFILE_LINK_SCORING_RULES,
};
