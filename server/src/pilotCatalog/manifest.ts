export const PILOT_CATALOG_VERSION = 1 as const;

export const pilotCatalogRiskCodes = [
  "EXTERNAL_PARTNER_REQUIRED",
  "PAID_TOOL_REQUIRED",
  "HARDWARE_REQUIRED",
  "LONG_DURATION",
  "SENSITIVE_DOMAIN",
  "RESOURCE_ACCESS_CHECK",
  "SOURCE_CONTEXT_CHECK",
  "OTHER",
] as const;

export type PilotCatalogRiskCode = (typeof pilotCatalogRiskCodes)[number];

export const pilotCatalogHumanReviewRiskCodes = [
  "EXTERNAL_PARTNER_REQUIRED",
  "SENSITIVE_DOMAIN",
] as const satisfies readonly PilotCatalogRiskCode[];

export function humanReviewRiskCodes(riskCodes: readonly PilotCatalogRiskCode[]) {
  const escalated = new Set<PilotCatalogRiskCode>(pilotCatalogHumanReviewRiskCodes);
  return riskCodes.filter((code) => escalated.has(code));
}

export type PilotCatalogCandidate = { projectId: string; reason: string; riskCodes: PilotCatalogRiskCode[] };

function candidate(projectId: string, reason: string, riskCodes: PilotCatalogRiskCode[] = []): PilotCatalogCandidate {
  return { projectId, reason, riskCodes };
}

// Candidates need independent reviews before entering READY_ONLY mode.
export const PILOT_CATALOG_V1: readonly PilotCatalogCandidate[] = [
  candidate("P001", "Bounded beginner build with a clear repository and working-demo outcome."),
  candidate("P004", "Strong full-stack proof with architecture, deployment, and an inspectable repository."),
  candidate("P006", "Accessible beginner web project with a concrete published artifact."),
  candidate("P007", "Backend-focused project with testable API, documentation, and deployment evidence."),
  candidate("P014", "Beginner ML workflow with a public dataset and measurable evaluation."),
  candidate("P019", "Accessible NLP analysis with a dashboard and inspectable methodology."),
  candidate("P022", "High-value responsible-ML audit with explicit subgroup evidence."),
  candidate("P023", "Public-data analysis with a bounded notebook and decision-oriented summary."),
  candidate("P027", "Clear experimental-analysis workflow with defensible statistical outputs."),
  candidate("P028", "Business-framed public-data project with interpretable recommendations."),
  candidate("P029", "Low-cost spreadsheet project with a reusable artifact and documented method."),
  candidate("P034", "Authorized security-lab practice with reproducible findings and mitigation notes.", [
    "SENSITIVE_DOMAIN",
    "RESOURCE_ACCESS_CHECK",
  ]),
  candidate("P036", "Bounded defensive-security analysis with a professional written artifact."),
  candidate("P038", "Practical protocol-analysis project with inspectable captures and findings."),
  candidate("P039", "Small digital-logic build with a complete free simulation path and optional hardware evidence."),
  candidate("P040", "Simulation-first embedded-systems project with optional low-voltage hardware evidence."),
  candidate("P047", "Simulation-first power-electronics project with measurable outputs."),
  candidate("P048", "Accessible signal-processing analysis using licensed audio, reproducible code, and comparisons."),
  candidate("P051", "Strong CAD iteration story with visible before-and-after evidence and optional printing."),
  candidate("P052", "FreeCAD-to-FEA workflow with native solver evidence, assumptions, stress results, and a technical memo."),
  candidate("P057", "Permissioned low-risk field-to-drawing workflow using free CAD and explicit safety and privacy controls."),
  candidate("P059", "Bounded ProjectLibre planning artifact with editable critical-path reasoning."),
  candidate("P061", "Bounded fictional estimating workflow with free tools, traceable quantities, and an auditable workbook."),
  candidate("P063", "Standard finance proof artifact with transparent assumptions and sensitivities."),
  candidate("P066", "Concise investment thesis with a model, evidence, and decision-ready presentation."),
  candidate("P070", "Public-data credit analysis with a clear written recommendation."),
  candidate("P071", "Clearly fictional campaign concept with a brief, assets, calendar, and hypothetical KPI logic."),
  candidate("P076", "Self-contained brand analysis with evidence-backed recommendations."),
  candidate("P079", "Research-heavy consulting artifact with cited evidence and executive synthesis."),
  candidate("P083", "Accessible operations simulation with measurable system behavior."),
  candidate("P086", "Clear optimization case with before-and-after diagrams and quantified tradeoffs."),
  candidate("P087", "Public-data market analysis with comparable evidence and executive conclusions."),
  candidate("P088", "Strong spreadsheet modeling artifact with transparent sensitivities."),
  candidate("P090", "Public clinical-data workflow with documented cleaning and analysis.", ["SENSITIVE_DOMAIN"]),
  candidate("P093", "Public-health dashboard with traceable sources and decision-oriented KPIs.", ["SENSITIVE_DOMAIN"]),
  candidate("P095", "Bounded HR analysis using public compensation evidence."),
  candidate("P096", "Synthetic survey-design case with measurable analysis and an actionable report."),
  candidate("P098", "Public-source policy analysis with a concise recommendation memo."),
  candidate("P100", "Bounded legal research artifact with citations and plain-language synthesis."),
  candidate("P101", "Fictional UX case study with explicit heuristic evidence and usability rationale."),
  candidate("P102", "End-to-end product design proof with research, flows, and prototype evidence."),
  candidate("P104", "Practical accessibility audit with reproducible findings and prioritized fixes."),
  candidate("P107", "Reusable education artifact with learning objectives and assessment evidence."),
  candidate("P110", "Research and writing project with source verification and a publishable artifact."),
  candidate(
    "P111",
    "Strong production artifact with a low-cost media fallback, rights controls, editing, captions, and reflection evidence.",
  ),
  candidate("P113", "Retail analysis with a visual layout, quantified assumptions, and recommendations."),
  candidate(
    "P114",
    "Offline ecommerce audit with fictional or unaffiliated inputs, traceable copy and image decisions, and no live performance claims.",
  ),
] as const;

export function pilotCatalogCandidate(projectId: string) {
  return PILOT_CATALOG_V1.find((entry) => entry.projectId === projectId) ?? null;
}
