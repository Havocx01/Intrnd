import type { SubmissionRequirement, SubmissionRequirements } from "../submissions/types.js";

const requirement = (
  key: string,
  kind: SubmissionRequirement["kind"],
  title: string,
  instructions: string,
  maxItems = 1,
): SubmissionRequirement => ({ key, kind, title, instructions, required: true, minItems: 1, maxItems });

const requirements = (...items: SubmissionRequirement[]): SubmissionRequirements => ({
  version: 1,
  instructions: "Submit every required item as one review package. Links must be accessible without requesting permission.",
  items,
});

export const PILOT_SUBMISSION_REQUIREMENTS_V1: Readonly<Record<string, SubmissionRequirements>> = {
  P004: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "Project repository",
      "Share the finished repository with setup, seed, local fallback, architecture, and test instructions.",
    ),
    requirement(
      "live-app",
      "LINK",
      "Live application",
      "Share the deployed HTTPS application link and confirm its primary workflow opens without requesting access.",
    ),
    requirement(
      "demo-video",
      "LINK",
      "Demo video",
      "Share an HTTPS video link demonstrating the primary workflow, validation behavior, and deployed result.",
    ),
    requirement(
      "architecture-diagram",
      "DOCUMENT",
      "Architecture diagram",
      "Upload a readable architecture diagram covering the client, API, PostgreSQL data flow, authentication boundary, and deployment.",
    ),
  ),
  P006: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "Site repository",
      "Share the finished Next.js or Astro repository with documented local and free-host deployment steps.",
    ),
    requirement(
      "site-link",
      "LINK",
      "Published portfolio site",
      "Share the HTTPS site link; it must include the project index, about/contact route, and all three substantive blog posts.",
    ),
  ),
  P014: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "Reproducible notebook repository",
      "Share the notebook, pinned dependencies, data retrieval notes, fixed split, baseline, and leakage checks.",
    ),
    requirement(
      "evaluation-package",
      "DOCUMENT",
      "Evaluation and ethics package",
      "Upload the evaluation report and data/ethics card covering the dataset, target, exclusions, metrics, subgroup limits, and prohibited decision uses.",
      3,
    ),
  ),
  P019: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "Runnable dashboard repository",
      "Share the Streamlit dashboard, notebook, fixed dataset instructions, dependencies, and local run command.",
    ),
    requirement(
      "evaluation-report",
      "DOCUMENT",
      "Sentiment evaluation report",
      "Upload the labeled-set evaluation, baseline comparison, error analysis, and limitations.",
    ),
    requirement(
      "dashboard-evidence",
      "IMAGE",
      "Dashboard screenshots",
      "Upload screenshots showing filters, summary metrics, example-level results, and an empty or invalid-input state.",
      5,
    ),
  ),
  P022: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "Fairness audit repository",
      "Share the reproducible Fairlearn notebook, pinned dependencies, data-source record, group-size checks, and mitigation comparison.",
    ),
    requirement(
      "audit-report",
      "DOCUMENT",
      "Fairness audit report",
      "Upload the 4-6 page report with metric rationale, uncertainty, intersectional limitations, mitigation trade-offs, and non-decision boundary.",
    ),
  ),
  P023: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "CDC PLACES analysis repository",
      "Share the notebook, saved source metadata, data dictionary references, cleaning steps, denominator handling, and reproducible outputs.",
    ),
    requirement(
      "insight-package",
      "DOCUMENT",
      "Insight summary and source log",
      "Upload the one-page descriptive summary plus the CDC release, measure IDs, population, geography, suppression rules, and retrieval date.",
      3,
    ),
  ),
  P027: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "Experiment-analysis repository",
      "Share the seeded synthetic-data generator, allocation checks, analysis notebook, tests, and reproducibility instructions.",
    ),
    requirement(
      "decision-memo",
      "DOCUMENT",
      "Experiment decision memo",
      "Upload the memo with hypothesis, primary outcome, sample adequacy, interval estimate, effect size, practical significance, and synthetic-case boundary.",
    ),
  ),
  P028: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "Churn-analysis repository",
      "Share the data retrieval record, notebook, split strategy, leakage checks, baseline, model, error analysis, and pinned dependencies.",
    ),
    requirement(
      "business-package",
      "DOCUMENT",
      "Data card and executive memo",
      "Upload the data card and memo with evaluation metrics, class-imbalance handling, feature limitations, and non-causal recommendations.",
      3,
    ),
  ),
  P029: requirements(
    requirement(
      "tracker-workbook",
      "FILE",
      "Editable carbon tracker",
      "Upload the editable Excel or LibreOffice workbook with inputs, unit conversions, linked EPA factors, formula checks, and uncertainty fields.",
    ),
    requirement(
      "tracker-method",
      "DOCUMENT",
      "Methodology and factor log",
      "Upload the methodology with EPA factor year, geography, units, retrieval date, assumptions, limitations, and worked verification example.",
      3,
    ),
  ),
  P036: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "Sanitized email-analysis repository",
      "Share only synthetic fixtures using reserved domains and TEST-NET addresses, plus the annotation and redaction method.",
    ),
    requirement(
      "analysis-report",
      "DOCUMENT",
      "Email analysis and confidence report",
      "Upload the five-page report with header-chain analysis, SPF/DKIM/DMARC interpretation, IOC provenance, confidence labels, and safety boundary.",
    ),
  ),
  P038: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "Traffic-analysis repository",
      "Share the filter log, capture provenance, analysis notes, and reproducibility instructions without credentials or unrelated-user traffic.",
    ),
    requirement(
      "pcap-files",
      "FILE",
      "Authorized PCAP evidence",
      "Upload only student-generated local-lab captures or clearly documented public sample captures; include a provenance note for each.",
      5,
    ),
    requirement(
      "analysis-report",
      "DOCUMENT",
      "Protocol analysis report",
      "Upload the four-page report with packet references, display filters, expected protocol behavior, anomalies, uncertainty, and privacy boundary.",
    ),
  ),
  P039: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "HDL repository",
      "Share HDL source, an automated testbench, truth-table expectations, waveform or log output, and synthesis or timing output when supported.",
    ),
    requirement(
      "demo-video",
      "LINK",
      "Simulation or hardware demo",
      "Share an HTTPS video demonstrating the calculator and required normal, invalid, carry, and overflow cases.",
    ),
    requirement(
      "schematic",
      "DOCUMENT",
      "Logic schematic and verification summary",
      "Upload the schematic, arithmetic truth table, tested edge cases, and tool/timing limitations.",
      3,
    ),
  ),
  P040: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "Controller repository",
      "Share Arduino code, simulation link or files, calibration data, fault tests, and setup instructions.",
    ),
    requirement(
      "demo-video",
      "LINK",
      "Controller demo video",
      "Share an HTTPS video showing dry/wet thresholds, hysteresis, manual override, and disconnected-sensor behavior in simulation or the optional low-voltage build.",
    ),
    requirement(
      "engineering-package",
      "DOCUMENT",
      "Schematic, BOM, and safety record",
      "Upload the path-specific schematic, bill of materials or zero-cost simulation list, calibration method, water/electrical separation rules, and test table.",
      5,
    ),
  ),
  P047: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "LTspice simulation repository",
      "Share native LTspice schematics, models, sweep directives, controller logic, and reproducible run instructions.",
    ),
    requirement(
      "technical-report",
      "DOCUMENT",
      "Power-electronics report",
      "Upload the two-page report with topology, PV/battery assumptions, PWM or MPPT behavior, efficiency, ripple, component stress, and limitations.",
    ),
    requirement(
      "waveform-evidence",
      "IMAGE",
      "Waveform and sweep evidence",
      "Upload legible operating-point, irradiance or input, battery-state, transient, ripple, and stress plots.",
      5,
    ),
  ),
  P048: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "DSP repository and rights record",
      "Share Octave or MATLAB code, student-owned or redistribution-permitted audio, before/after outputs, FFT plots, listening protocol, and source/license log.",
    ),
  ),
  P051: requirements(
    requirement(
      "cad-files",
      "FILE",
      "Native FreeCAD and STL files",
      "Upload the editable FreeCAD source plus final STL export; printer access and a physical print are optional.",
      3,
    ),
    requirement(
      "iteration-evidence",
      "IMAGE",
      "Three CAD iteration views",
      "Upload three labeled renders or dimensioned screenshots that show distinct iterations and the change made in each.",
      5,
    ),
    requirement(
      "design-rationale",
      "DOCUMENT",
      "Design rationale and print-readiness checks",
      "Upload the rationale with requirements, dimensions, stability and clearance checks, export validation, and optional print observations.",
    ),
  ),
  P052: requirements(
    requirement(
      "solver-project",
      "FILE",
      "Native FEA project archive",
      "Upload the native SimScale export or Ansys project archive, including geometry, mesh, materials, loads, constraints, and solver settings.",
    ),
    requirement(
      "analysis-report",
      "DOCUMENT",
      "Stress maps and technical memo",
      "Upload the stress maps, safety-factor results, assumptions, solver-limit notes, and the two-page technical memo.",
      5,
    ),
  ),
  P057: requirements(
    requirement(
      "plan-source",
      "FILE",
      "Editable CAD plan",
      "Upload the native FreeCAD or LibreCAD drawing with units, scale, dimensions, layers, and revision metadata.",
    ),
    requirement(
      "survey-package",
      "DOCUMENT",
      "Plan PDF and survey method",
      "Upload the plan PDF, permission or student-control attestation, safety note, measurement method, tolerance, closure checks, and limitations.",
      5,
    ),
    requirement(
      "site-evidence",
      "IMAGE",
      "Privacy-safe site evidence",
      "Upload only permissioned photos or sketches with faces, addresses, credentials, plates, and private details removed.",
      5,
    ),
  ),
  P059: requirements(
    requirement(
      "schedule-project",
      "FILE",
      "Native schedule project",
      "Upload the editable ProjectLibre, Primavera, or Microsoft Project file with activities, dependencies, calendars, critical path, and resource assignments.",
    ),
    requirement(
      "schedule-report",
      "DOCUMENT",
      "Schedule PDF and narrative",
      "Upload the exported Gantt/critical-path PDF and the one-page assumptions and risk narrative.",
      5,
    ),
  ),
  P061: requirements(
    requirement(
      "takeoff-source",
      "FILE",
      "Editable takeoff source",
      "Upload the editable LibreOffice Draw/Calc or compatible markup and takeoff source files.",
    ),
    requirement(
      "takeoff-package",
      "DOCUMENT",
      "Takeoff workbook and cost memo",
      "Upload the formula-driven quantity workbook, marked-up plan, source log, and two-page cost memo.",
      5,
    ),
  ),
  P063: requirements(
    requirement(
      "dcf-model",
      "FILE",
      "Editable DCF model",
      "Upload the editable model with sourced inputs, linked formulas, WACC build, enterprise-to-equity bridge, sensitivities, and visible audit checks.",
    ),
    requirement(
      "valuation-presentation",
      "DOCUMENT",
      "Valuation deck and memo",
      "Upload the five-slide deck and two-page memo, clearly dated and consistent with the submitted model.",
      3,
    ),
    requirement(
      "valuation-sources",
      "DOCUMENT",
      "Dated valuation source log",
      "Upload the source log with URLs, filing periods, retrieval dates, price date, units, and transformations.",
    ),
  ),
  P066: requirements(
    requirement(
      "equity-model",
      "FILE",
      "Editable comparable-company model",
      "Upload the editable model with directly sourced inputs, peer rules, multiple calculations, unit checks, and scenario support.",
    ),
    requirement(
      "pitch-package",
      "DOCUMENT",
      "Pitch deck and memo",
      "Upload the ten-slide deck and one-page memo with thesis, catalysts, disconfirming evidence, bear case, risks, and model-consistent conclusions.",
      3,
    ),
    requirement(
      "equity-sources",
      "DOCUMENT",
      "Dated market and peer source log",
      "Upload the filing, price, period, peer-selection, and inclusion/exclusion evidence.",
    ),
  ),
  P070: requirements(
    requirement(
      "credit-model",
      "FILE",
      "Editable credit model",
      "Upload the ratio, liquidity, coverage, maturity, downside, and comp calculations with visible checks.",
    ),
    requirement(
      "credit-memo",
      "DOCUMENT",
      "Credit memo",
      "Upload the five-page memo with issuer and security identity, debt stack, liquidity, covenants, downside case, rating-method comparison, and bounded conclusion.",
    ),
    requirement(
      "bond-sources",
      "DOCUMENT",
      "Prospectus and filing source log",
      "Upload a dated log linking the SEC prospectus or indenture, current filings used, covenant pages, and any public pricing source.",
    ),
  ),
  P071: requirements(
    requirement(
      "campaign-brief",
      "DOCUMENT",
      "Fictional campaign brief",
      "Upload the brief, content calendar, hypothetical KPI framework, offline test plan, and explicit unaffiliated fictional-brand disclaimer.",
      5,
    ),
    requirement(
      "campaign-assets",
      "IMAGE",
      "Campaign creative assets",
      "Upload three accessible creative variants labeled as fictional practice work and never as live brand content.",
      5,
    ),
  ),
  P076: requirements(
    requirement(
      "brand-audit",
      "DOCUMENT",
      "Brand audit and executive summary",
      "Upload the eight-page audit and one-page executive summary with cited observations, competitor selection, and bounded recommendations.",
      3,
    ),
    requirement(
      "brand-sources",
      "DOCUMENT",
      "Dated public-evidence log",
      "Upload the retrieval-dated company, customer, competitor, and market sources plus the evidence-to-recommendation matrix.",
    ),
  ),
  P079: requirements(
    requirement(
      "market-sizing",
      "FILE",
      "Market-sizing workbook",
      "Upload the editable top-down and bottom-up sizing model with units, formulas, scenarios, and reconciliation checks.",
    ),
    requirement(
      "market-entry-report",
      "DOCUMENT",
      "Market-entry report and slide summary",
      "Upload the 15-page report and five-slide summary covering decision, geography, customer, competitors, alternatives, risks, and implementation.",
      3,
    ),
    requirement(
      "market-sources",
      "DOCUMENT",
      "Annotated source hierarchy",
      "Upload the annotated bibliography with publication dates, retrieval dates, source quality, definitions, and conflicting evidence.",
    ),
  ),
  P083: requirements(
    requirement(
      "beer-game-model",
      "FILE",
      "Editable Beer Game simulation",
      "Upload the four-echelon spreadsheet with fixed starting conditions, demand sequence, delays, formulas, two policy runs, and checks.",
    ),
    requirement(
      "beer-game-report",
      "DOCUMENT",
      "Simulation analysis report",
      "Upload the four-page report with inventory, backlog, service level, order variance, bullwhip measure, policy comparison, and limitations.",
    ),
  ),
  P086: requirements(
    requirement(
      "layout-model",
      "FILE",
      "Editable warehouse calculation model",
      "Upload the fixed synthetic case, baseline and proposed travel calculations, capacity checks, exception tests, and assumptions.",
    ),
    requirement(
      "layout-diagrams",
      "IMAGE",
      "Before-and-after layout diagrams",
      "Upload legible diagrams with dimensions, dock, aisles, storage zones, emergency access, and travel paths.",
      5,
    ),
    requirement(
      "layout-case",
      "DOCUMENT",
      "Warehouse optimization case study",
      "Upload the five-page case study with baseline, quantified comparison, capacity and safety constraints, trade-offs, and implementation steps.",
    ),
  ),
  P088: requirements(
    requirement(
      "pro-forma-model",
      "FILE",
      "Editable pro forma model",
      "Upload the linked input, operating pro forma, debt schedule, returns, sensitivity, and formula-check sheets.",
    ),
    requirement(
      "investment-memo",
      "DOCUMENT",
      "Practice investment memo",
      "Upload the three-page memo with base, upside, downside, decision drivers, limitations, and explicit fictional-case disclaimer.",
    ),
  ),
  P090: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "NHANES cleaning repository",
      "Share the notebook, source metadata, pinned dependencies, codebook mapping, missing-code handling, units, inclusion criteria, and reproducible cleaning log.",
    ),
    requirement(
      "health-summary",
      "DOCUMENT",
      "Descriptive analysis summary",
      "Upload the one-page summary and data/privacy note; prohibit clinical, causal, diagnostic, and patient-level conclusions.",
    ),
  ),
  P093: requirements(
    requirement(
      "dashboard-link",
      "LINK",
      "Viewable Tableau Public dashboard",
      "Share an HTTPS Tableau Public link that opens without requesting access and uses only aggregate public data.",
    ),
    requirement(
      "dashboard-file",
      "FILE",
      "Packaged dashboard workbook or export",
      "Upload the packaged workbook or reproducible export with cleaned data and field definitions.",
    ),
    requirement(
      "dashboard-writeup",
      "DOCUMENT",
      "Dashboard write-up and CDC source log",
      "Upload the one-page write-up plus release, dictionary, measures, population, denominators, suppression rules, retrieval date, accessibility checks, and non-clinical limitations.",
      3,
    ),
  ),
  P095: requirements(
    requirement(
      "comp-workbook",
      "FILE",
      "Editable compensation workbook",
      "Upload the raw-source, normalized benchmark, practice-range, formula-check, and summary sheets.",
    ),
    requirement(
      "comp-package",
      "DOCUMENT",
      "Compensation memo and source log",
      "Upload the three-page memo, one-page summary, and OEWS occupation, geography, release, normalization, suppression, and retrieval log.",
      5,
    ),
  ),
  P096: requirements(
    requirement(
      "survey-files",
      "FILE",
      "Survey instrument and synthetic dataset",
      "Upload the final instrument, codebook, disclosed seeded generator or generation record, and synthetic responses.",
      5,
    ),
    requirement(
      "survey-analysis",
      "DOCUMENT",
      "Results report and action memo",
      "Upload the results report and action memo with anonymity rules, small-group suppression, uncertainty, synthetic-data disclosure, and no employment-decision use.",
      3,
    ),
  ),
  P098: requirements(
    requirement(
      "policy-memo",
      "DOCUMENT",
      "Chicago composting policy memo",
      "Upload the eight-page memo and one-page executive summary with alternatives, stakeholders, legal authority, fiscal and operational trade-offs, implementation, and limitations.",
      3,
    ),
    requirement(
      "policy-sources",
      "DOCUMENT",
      "Dated authority and source list",
      "Upload the current Chicago ordinance/program, budget or operations, public-data, stakeholder, and counterevidence sources with retrieval dates.",
    ),
  ),
  P100: requirements(
    requirement(
      "case-brief",
      "DOCUMENT",
      "Academic legal brief and summary",
      "Upload the five-page brief and one-page plain-language summary covering posture, issue, holding, reasoning, dicta, counterargument, and no-legal-advice boundary.",
      3,
    ),
    requirement(
      "authority-log",
      "DOCUMENT",
      "Authority and history log",
      "Upload links and pin cites to the official opinion plus citation, subsequent-history, and currentness checks.",
    ),
  ),
  P101: requirements(
    requirement(
      "prototype-link",
      "LINK",
      "Viewable Figma prototype",
      "Share a view-only HTTPS prototype link that opens without requesting access.",
    ),
    requirement(
      "redesign-case",
      "DOCUMENT",
      "Fictional redesign case study",
      "Upload the eight-page case study with unaffiliated disclaimer, heuristic protocol, evidence, flows, accessibility checks, decisions, and limitations.",
    ),
    requirement(
      "redesign-screens",
      "IMAGE",
      "Before-and-after screens",
      "Upload labeled baseline and final screens that do not imply affiliation or invented participant findings.",
      5,
    ),
  ),
  P102: requirements(
    requirement(
      "prototype-link",
      "LINK",
      "Viewable Figma prototype",
      "Share a view-only HTTPS link to the interactive prototype that opens without requesting access.",
    ),
    requirement(
      "design-case",
      "DOCUMENT",
      "Design case study",
      "Upload the case-study PDF covering research or heuristic evidence, flows, design system, accessibility checks, and limitations.",
      5,
    ),
  ),
  P104: requirements(
    requirement(
      "repository",
      "REPOSITORY",
      "Accessibility audit repository",
      "Share any scripts, axe or Lighthouse exports, manual test protocol, issue log, and reproducibility instructions.",
    ),
    requirement(
      "audit-report",
      "DOCUMENT",
      "Accessibility audit report",
      "Upload the bounded-page audit with WCAG 2.2 level, reproducible steps, severity rationale, automated and manual results, fixes, and non-certification disclaimer.",
    ),
    requirement(
      "audit-evidence",
      "IMAGE",
      "Annotated accessibility evidence",
      "Upload privacy-safe screenshots showing representative issues and test states.",
      5,
    ),
  ),
  P107: requirements(
    requirement("module-link", "LINK", "Hosted OER module", "Share an HTTPS public module link that opens without requesting access."),
    requirement(
      "module-package",
      "FILE",
      "Downloadable module package",
      "Upload the reusable source or export including content, aligned assessment, accessibility metadata, and license information.",
      5,
    ),
    requirement(
      "module-method",
      "DOCUMENT",
      "Methodology and attribution log",
      "Upload the one-page methodology plus learning-objective mapping, peer evaluation, Creative Commons license, and attributions.",
      3,
    ),
  ),
  P110: requirements(
    requirement(
      "article-package",
      "DOCUMENT",
      "Article and editorial package",
      "Upload the 2,000-word publishable article plus source ledger, claim-level fact-check, rights/privacy review, right-of-reply record where needed, corrections note, and methodology.",
      5,
    ),
  ),
  P111: requirements(
    requirement(
      "documentary-link",
      "LINK",
      "Public documentary link",
      "Share an unlisted or public HTTPS video link that opens without requesting access and includes captions.",
    ),
    requirement(
      "production-notes",
      "DOCUMENT",
      "Production notes",
      "Upload production notes covering sources, permissions or public-domain licenses, editing decisions, accessibility, and contingencies.",
      5,
    ),
  ),
  P113: requirements(
    requirement(
      "retail-model",
      "FILE",
      "Editable retail analysis workbook",
      "Upload the fixed fictional scenario, conversion calculations, assumptions, sensitivities, and checks.",
    ),
    requirement(
      "retail-layouts",
      "IMAGE",
      "Before-and-after floor plans",
      "Upload dimensioned diagrams showing entrances, checkout, fixtures, customer path, accessibility, and safety constraints.",
      5,
    ),
    requirement(
      "retail-memo",
      "DOCUMENT",
      "Retail analysis memo",
      "Upload the four-page memo with synthetic baseline, proposed layout, quantified estimates, limitations, and no-client/no-live-results disclaimer.",
    ),
  ),
  P114: requirements(
    requirement(
      "listing-audit",
      "DOCUMENT",
      "Offline listing audit and variants",
      "Upload the fictional or unaffiliated before/after listing audit, copy and image variants, keyword rationale, and test plan. Do not claim live performance results.",
      5,
    ),
  ),
};

export function pilotSubmissionRequirements(projectId: string) {
  return PILOT_SUBMISSION_REQUIREMENTS_V1[projectId] ?? null;
}
