const fs = require("fs");
const path = require("path");
const {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} = require("docx");
const { formatEvidenceList } = require("../interpretation/evidence-utils");

async function generateDocxReport(reportModel, options = {}) {
  const outputPath = options.outputPath || reportModel.paths.outputPath;
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: buildDocumentChildren(reportModel),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);

  return {
    outputPath,
    screenshotCount: reportModel.evidence_appendix.screenshots.length,
  };
}

function buildDocumentChildren(model) {
  return [
    ...coverPage(model.cover_page),
    heading("Executive Summary", HeadingLevel.HEADING_1),
    ...bullets(model.executive_summary.summary_points),
    kvTable([
      ["Coverage", model.executive_summary.coverage_label],
      ["Primary profile", model.executive_summary.primary_profile],
      ["Sub-profile", model.executive_summary.sub_profile || "Not observed"],
      ["Evidence sources", formatEvidenceList(model.executive_summary.evidence_sources, { separator: ", " })],
    ]),
    heading("Website Overview", HeadingLevel.HEADING_1),
    kvTable([
      ["Input URL", model.website_overview.input_url],
      ["Audit key", model.website_overview.audit_key],
      ["Site host", model.website_overview.site_host],
      ["Same-site subdomains included", yesNo(model.website_overview.same_site_subdomains_included)],
      ["Visited pages", model.website_overview.visited_pages],
      ["Maximum pages", model.website_overview.max_pages],
      ["Site discovery available", yesNo(model.website_overview.discovery_available)],
    ]),
    heading("Digital Estate", HeadingLevel.HEADING_1),
    paragraph(`Observed domains/subdomains: ${formatEvidenceList(model.digital_estate.domains_discovered, { separator: ", " }) || "Not observed"}`),
    paragraph(`Representative journey families identified: ${formatEvidenceList(model.digital_estate.journey_families_discovered, { separator: ", " }) || "Not observed"}`),
    heading("Representative Journeys", HeadingLevel.HEADING_1),
    ...representativeJourneySection(model.representative_journeys),
    heading("Measurement Opportunities", HeadingLevel.HEADING_1),
    ...measurementOpportunitySection(model.measurement_opportunities),
    heading("Technology Review", HeadingLevel.HEADING_1),
    ...technologySection(model.technology_review),
    heading("Consent Review", HeadingLevel.HEADING_1),
    ...consentSection(model.consent_review),
    heading("Evidence Appendix", HeadingLevel.HEADING_1),
    kvTable([
      ["Journey map", model.evidence_appendix.journey_map_path],
      ["Site discovery", model.evidence_appendix.site_discovery_path],
      ["Evidence workbook", model.evidence_appendix.workbook_path],
      ["Visited steps", model.evidence_appendix.visited_steps],
      ["Failed steps", model.evidence_appendix.failed_steps],
      ["Skipped steps", model.evidence_appendix.skipped_steps],
      ["Screenshots included", model.evidence_appendix.screenshots.length],
    ]),
  ];
}

function coverPage(cover) {
  return [
    new Paragraph({
      text: cover.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),
    new Paragraph({ text: cover.subtitle, alignment: AlignmentType.CENTER, spacing: { after: 600 } }),
    kvTable([
      ["Client", cover.client_name || "Not supplied"],
      ["Site", cover.site],
      ["Audit date", cover.audit_date],
      ["Prepared by", cover.prepared_by],
    ]),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function representativeJourneySection(journeys) {
  if (!journeys.length) return [paragraph("No representative journeys were available in the captured evidence.")];
  return journeys.flatMap((journey) => [
    heading(journey.journey_family, HeadingLevel.HEADING_2),
    kvTable([
      ["Status", journey.status],
      ["Journey observed", journey.narrative],
      ["Evidence", formatEvidenceList(journey.evidence)],
      ["Follow-up question", journey.follow_up_question || ""],
    ]),
    ...screenshotBlocks(journey.screenshots),
  ]);
}

function measurementOpportunitySection(opportunities) {
  if (!opportunities.length) return [paragraph("No deterministic measurement opportunities were generated from validated journey evidence.")];
  return opportunities.flatMap((item, index) => [
    heading(`Opportunity ${index + 1}`, HeadingLevel.HEADING_2),
    kvTable([
      ["Evidence observed", item.evidence_observed],
      ["Observation", item.observation],
      ["Possible business impact", item.possible_business_impact],
      ["Validation required", item.validation_required],
      ["Relevant evidence", formatEvidenceList(item.relevant_evidence)],
    ]),
    ...screenshotBlocks(item.screenshot ? [item.screenshot] : []),
  ]);
}

function technologySection(groups) {
  if (!groups.length) return [paragraph("No technology evidence was available in the captured audit data.")];
  return groups.map((group) => kvTable([
    ["Category", group.category],
    ["Observed evidence", formatEvidenceList(group.observed_evidence)],
    ["Notes", group.notes],
  ])).flat();
}

function consentSection(consent) {
  return [kvTable([
    ["Consent interaction observed", yesNo(consent.interaction_observed)],
    ["Consent status", consent.status],
    ["CMP detected", yesNo(consent.cmp_detected)],
    ["Platforms observed", formatEvidenceList(consent.platforms_observed)],
    ["Pre-consent evidence", yesNo(consent.pre_consent_evidence)],
    ["Post-consent evidence", yesNo(consent.post_consent_evidence)],
    ["Network evidence", yesNo(consent.network_evidence)],
    ["Note", consent.note],
  ])];
}

function screenshotBlocks(screenshots) {
  return (screenshots || []).flatMap((screenshot) => {
    if (!screenshot?.path || !fs.existsSync(screenshot.path)) return [];
    return [
      new Paragraph({
        children: [new ImageRun({ data: fs.readFileSync(screenshot.path), transformation: { width: 520, height: 300 } })],
        spacing: { before: 200, after: 100 },
      }),
      paragraph(`Figure. ${screenshot.title || "Screenshot"} — Step ${screenshot.step_index} — ${screenshot.url}`),
    ];
  });
}

function kvTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([key, value]) => new TableRow({
      children: [
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [paragraph(String(key), { bold: true })] }),
        new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [paragraph(value)] }),
      ],
    })),
  });
}

function heading(text, level) {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 120 } });
}

function paragraph(text, options = {}) {
  return new Paragraph({
    children: [new TextRun({ text: String(text || ""), bold: Boolean(options.bold) })],
    spacing: { after: 120 },
  });
}

function bullets(items) {
  return (items || []).map((item) => new Paragraph({
    text: String(item || ""),
    bullet: { level: 0 },
    spacing: { after: 80 },
  }));
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

module.exports = {
  generateDocxReport,
};
