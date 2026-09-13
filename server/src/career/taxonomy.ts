export const CAREER_TAXONOMY_VERSION = "career-v1" as const;

export type CareerTaxonomyItem = {
  id: string;
  label: string;
  aliases?: readonly string[];
  domainId?: string;
  relatedRoleIds?: readonly string[];
};

const item = (
  id: string,
  label: string,
  options: Omit<CareerTaxonomyItem, "id" | "label"> = {},
): CareerTaxonomyItem => ({ id, label, ...options });

export const careerDomains = [
  item("software", "Software engineering"),
  item("ai-data", "AI and data"),
  item("cybersecurity", "Cybersecurity"),
  item("computer-engineering", "Computer engineering"),
  item("electrical-engineering", "Electrical engineering"),
  item("mechanical-engineering", "Mechanical engineering"),
  item("civil-construction", "Civil engineering and construction"),
  item("finance", "Finance"),
  item("marketing", "Marketing"),
  item("consulting-operations", "Consulting and operations"),
  item("real-estate", "Real estate"),
  item("healthcare", "Healthcare and public health"),
  item("human-resources", "Human resources"),
  item("legal-public-sector", "Legal and public sector"),
  item("design", "Design and user experience"),
  item("education", "Education"),
  item("media", "Media and communications"),
  item("retail", "Retail and ecommerce"),
] as const;

export const careerRoles = [
  item("software-developer", "Software developer", { domainId: "software", aliases: ["software engineer", "product engineer"] }),
  item("backend-developer", "Backend developer", { domainId: "software", aliases: ["backend engineer"], relatedRoleIds: ["api-developer", "full-stack-developer"] }),
  item("api-developer", "API developer", { domainId: "software", aliases: ["api engineer"], relatedRoleIds: ["backend-developer"] }),
  item("frontend-developer", "Frontend developer", { domainId: "software", aliases: ["frontend engineer"], relatedRoleIds: ["web-developer", "full-stack-developer"] }),
  item("web-developer", "Web developer", { domainId: "software", relatedRoleIds: ["frontend-developer", "full-stack-developer"] }),
  item("full-stack-developer", "Full-stack developer", { domainId: "software", aliases: ["full stack engineer"], relatedRoleIds: ["frontend-developer", "backend-developer"] }),
  item("data-analyst", "Data analyst", { domainId: "ai-data", aliases: ["business data analyst"], relatedRoleIds: ["business-analyst", "health-data-analyst"] }),
  item("data-scientist", "Data scientist", { domainId: "ai-data", relatedRoleIds: ["machine-learning-engineer", "data-analyst"] }),
  item("machine-learning-engineer", "Machine learning engineer", { domainId: "ai-data", aliases: ["ml engineer", "ai engineer"], relatedRoleIds: ["data-scientist"] }),
  item("nlp-analyst", "NLP analyst", { domainId: "ai-data", aliases: ["natural language processing analyst"], relatedRoleIds: ["data-scientist"] }),
  item("responsible-ai-analyst", "Responsible AI analyst", { domainId: "ai-data", aliases: ["ai governance analyst", "model risk analyst"] }),
  item("business-analyst", "Business analyst", { domainId: "consulting-operations", relatedRoleIds: ["data-analyst", "consulting-analyst"] }),
  item("marketing-analyst", "Marketing analyst", { domainId: "marketing", relatedRoleIds: ["digital-marketing-analyst", "market-research-analyst"] }),
  item("sustainability-analyst", "Sustainability analyst", { domainId: "consulting-operations", aliases: ["environmental analyst"] }),
  item("security-analyst", "Security analyst", { domainId: "cybersecurity", aliases: ["cybersecurity analyst"], relatedRoleIds: ["application-security-analyst", "threat-analyst", "network-security-analyst"] }),
  item("application-security-analyst", "Application security analyst", { domainId: "cybersecurity", aliases: ["appsec analyst"], relatedRoleIds: ["security-analyst"] }),
  item("threat-analyst", "Threat analyst", { domainId: "cybersecurity", aliases: ["soc analyst"], relatedRoleIds: ["security-analyst"] }),
  item("network-security-analyst", "Network security analyst", { domainId: "cybersecurity", relatedRoleIds: ["security-analyst"] }),
  item("digital-design-engineer", "Digital design engineer", { domainId: "computer-engineering", aliases: ["fpga engineer"] }),
  item("embedded-systems-engineer", "Embedded systems engineer", { domainId: "computer-engineering", aliases: ["firmware engineer"] }),
  item("power-electronics-engineer", "Power electronics engineer", { domainId: "electrical-engineering" }),
  item("signal-processing-engineer", "Signal processing engineer", { domainId: "electrical-engineering" }),
  item("mechanical-design-engineer", "Mechanical design engineer", { domainId: "mechanical-engineering", relatedRoleIds: ["mechanical-engineer"] }),
  item("mechanical-engineer", "Mechanical engineer", { domainId: "mechanical-engineering", relatedRoleIds: ["mechanical-design-engineer"] }),
  item("civil-engineer", "Civil engineer", { domainId: "civil-construction", relatedRoleIds: ["construction-project-engineer"] }),
  item("construction-project-engineer", "Construction project engineer", { domainId: "civil-construction", aliases: ["project engineer"] }),
  item("construction-estimator", "Construction estimator", { domainId: "civil-construction", aliases: ["cost estimator"] }),
  item("financial-analyst", "Financial analyst", { domainId: "finance", relatedRoleIds: ["investment-banking-analyst", "credit-analyst"] }),
  item("investment-banking-analyst", "Investment banking analyst", { domainId: "finance", relatedRoleIds: ["financial-analyst", "equity-research-analyst"] }),
  item("equity-research-analyst", "Equity research analyst", { domainId: "finance", relatedRoleIds: ["investment-banking-analyst"] }),
  item("credit-analyst", "Credit analyst", { domainId: "finance", relatedRoleIds: ["financial-analyst"] }),
  item("digital-marketing-analyst", "Digital marketing analyst", { domainId: "marketing", relatedRoleIds: ["marketing-analyst"] }),
  item("brand-strategist", "Brand strategist", { domainId: "marketing", aliases: ["brand analyst"] }),
  item("consulting-analyst", "Consulting analyst", { domainId: "consulting-operations", relatedRoleIds: ["business-analyst", "market-research-analyst"] }),
  item("market-research-analyst", "Market research analyst", { domainId: "consulting-operations", relatedRoleIds: ["consulting-analyst", "marketing-analyst"] }),
  item("supply-chain-analyst", "Supply chain analyst", { domainId: "consulting-operations", relatedRoleIds: ["operations-analyst"] }),
  item("operations-analyst", "Operations analyst", { domainId: "consulting-operations", relatedRoleIds: ["supply-chain-analyst"] }),
  item("real-estate-analyst", "Real estate analyst", { domainId: "real-estate", aliases: ["real estate investment analyst"] }),
  item("health-data-analyst", "Health data analyst", { domainId: "healthcare", relatedRoleIds: ["public-health-analyst", "data-analyst"] }),
  item("public-health-analyst", "Public health analyst", { domainId: "healthcare", relatedRoleIds: ["health-data-analyst"] }),
  item("compensation-analyst", "Compensation analyst", { domainId: "human-resources", relatedRoleIds: ["people-analytics-analyst"] }),
  item("people-analytics-analyst", "People analytics analyst", { domainId: "human-resources", relatedRoleIds: ["compensation-analyst"] }),
  item("policy-analyst", "Policy analyst", { domainId: "legal-public-sector" }),
  item("legal-analyst", "Legal analyst", { domainId: "legal-public-sector", aliases: ["legal intern", "legal researcher"] }),
  item("ux-designer", "UX designer", { domainId: "design", aliases: ["user experience designer"], relatedRoleIds: ["product-designer", "ux-researcher"] }),
  item("product-designer", "Product designer", { domainId: "design", relatedRoleIds: ["ux-designer"] }),
  item("ux-researcher", "UX researcher", { domainId: "design", relatedRoleIds: ["ux-designer"] }),
  item("accessibility-specialist", "Digital accessibility specialist", { domainId: "design", aliases: ["accessibility analyst"] }),
  item("instructional-designer", "Instructional designer", { domainId: "education", aliases: ["curriculum designer"] }),
  item("journalist", "Journalist", { domainId: "media", aliases: ["reporter", "investigative journalist"] }),
  item("video-producer", "Video producer", { domainId: "media", aliases: ["multimedia producer"] }),
  item("retail-analyst", "Retail analyst", { domainId: "retail" }),
  item("ecommerce-specialist", "Ecommerce specialist", { domainId: "retail", aliases: ["e-commerce specialist"] }),
] as const;

const competencyLabels: Record<string, string> = {
  "api-integration": "API integration", "json-processing": "JSON processing", "command-line-interface": "Command-line interfaces",
  "react-development": "React development", "node-development": "Node.js development", "rest-api-design": "REST API design", "postgresql": "PostgreSQL", "authentication": "Authentication", "deployment": "Deployment",
  "responsive-web-design": "Responsive web design", "web-content-publishing": "Web content publishing", "jwt-security": "JWT security", "api-documentation": "API documentation",
  "data-cleaning": "Data cleaning", "predictive-modeling": "Predictive modeling", "feature-engineering": "Feature engineering", "model-evaluation": "Model evaluation",
  "natural-language-processing": "Natural language processing", "data-visualization": "Data visualization", "fairness-evaluation": "Fairness evaluation", "subgroup-analysis": "Subgroup analysis", "mitigation-analysis": "Mitigation analysis",
  "correlation-analysis": "Correlation analysis", "data-storytelling": "Data storytelling", "hypothesis-testing": "Hypothesis testing", "effect-size-analysis": "Effect-size analysis", "business-recommendations": "Business recommendations",
  "spreadsheet-modeling": "Spreadsheet modeling", "formula-design": "Formula design", "owasp-testing": "OWASP security testing", "vulnerability-reporting": "Vulnerability reporting", "email-header-analysis": "Email header analysis", "threat-intelligence": "Threat intelligence", "network-protocol-analysis": "Network protocol analysis", "ioc-identification": "Indicator-of-compromise identification",
  "digital-logic-design": "Digital logic design", "hdl-development": "HDL development", "fpga-toolchains": "FPGA toolchains", "embedded-programming": "Embedded programming", "sensor-integration": "Sensor integration", "circuit-prototyping": "Circuit prototyping",
  "circuit-simulation": "Circuit simulation", "power-control": "Power control", "battery-modeling": "Battery modeling", "digital-signal-processing": "Digital signal processing", "frequency-analysis": "Frequency analysis", "audio-processing": "Audio processing",
  "cad-modeling": "CAD modeling", "iterative-design": "Iterative design", "design-for-manufacture": "Design for manufacture", "finite-element-analysis": "Finite element analysis", "material-selection": "Material selection", "safety-factor-analysis": "Safety-factor analysis",
  "site-measurement": "Site measurement", "technical-drafting": "Technical drafting", "construction-scheduling": "Construction scheduling", "critical-path-analysis": "Critical-path analysis", "resource-leveling": "Resource leveling", "quantity-takeoff": "Quantity takeoff", "unit-costing": "Unit costing",
  "financial-modeling": "Financial modeling", "discounted-cash-flow": "Discounted cash flow", "sensitivity-analysis": "Sensitivity analysis", "investment-thesis": "Investment thesis", "comparable-analysis": "Comparable analysis", "credit-analysis": "Credit analysis", "covenant-analysis": "Covenant analysis",
  "campaign-planning": "Campaign planning", "audience-segmentation": "Audience segmentation", "marketing-experiment-design": "Marketing experiment design", "brand-analysis": "Brand analysis", "competitive-analysis": "Competitive analysis", "recommendation-writing": "Recommendation writing",
  "secondary-research": "Secondary research", "industry-analysis": "Industry analysis", "executive-communication": "Executive communication", "inventory-dynamics": "Inventory dynamics", "operations-simulation": "Operations simulation", "layout-optimization": "Layout optimization", "capacity-planning": "Capacity planning",
  "market-comparables": "Market comparables", "market-metrics": "Market metrics", "real-estate-pro-forma": "Real estate pro forma", "investment-returns": "Investment returns",
  "descriptive-statistics": "Descriptive statistics", "kpi-design": "KPI design", "public-data-sourcing": "Public data sourcing", "compensation-benchmarking": "Compensation benchmarking", "pay-range-design": "Pay range design", "survey-design": "Survey design", "survey-analysis": "Survey analysis",
  "policy-writing": "Policy writing", "stakeholder-analysis": "Stakeholder analysis", "source-citation": "Source citation", "case-briefing": "Case briefing", "legal-research": "Legal research", "plain-language-writing": "Plain-language writing",
  "user-research": "User research", "usability-evaluation": "Usability evaluation", "wireframing": "Wireframing", "prototyping": "Prototyping", "information-architecture": "Information architecture", "design-systems": "Design systems", "accessibility-auditing": "Accessibility auditing", "wcag-evaluation": "WCAG evaluation",
  "backward-design": "Backward design", "learning-assessment": "Learning assessment", "accessible-content": "Accessible content", "source-verification": "Source verification", "investigative-research": "Investigative research", "narrative-writing": "Narrative writing", "video-preproduction": "Video pre-production", "interview-production": "Interview production", "video-editing": "Video editing",
  "retail-conversion-analysis": "Retail conversion analysis", "retail-layout-planning": "Retail layout planning", "ecommerce-copywriting": "Ecommerce copywriting", "search-optimization": "Search optimization", "image-testing": "Image testing",
  "traffic-filtering": "Network traffic filtering", "evidence-reporting": "Evidence-based technical reporting",
};

const competencyAliases: Record<string, string[]> = {
  "api-integration": ["API calls", "APIs"], "rest-api-design": ["API design", "REST APIs"], "json-processing": ["JSON parsing"],
  "react-development": ["React"], "node-development": ["Node", "Node.js", "Express"], "postgresql": ["Postgres", "SQL"],
  "authentication": ["Auth"], "deployment": ["Cloud deployment"], "predictive-modeling": ["Machine learning", "scikit-learn"],
  "natural-language-processing": ["NLP"], "data-visualization": ["Visualization", "Tableau"], "spreadsheet-modeling": ["Excel", "Google Sheets"],
  "financial-modeling": ["Finance modeling", "Three-statement modeling"], "cad-modeling": ["CAD", "Fusion 360", "SolidWorks"],
  "accessibility-auditing": ["Accessibility"], "wcag-evaluation": ["WCAG"], "prototyping": ["Figma", "Prototype"],
};

export const careerCompetencies = Object.entries(competencyLabels).map(([id, label]) => item(id, label, { aliases: [label, ...(competencyAliases[id] ?? [])] }));

export const portfolioSignals = [
  item("code-repository", "Inspectable code repository"), item("deployed-application", "Deployed application"),
  item("technical-documentation", "Technical documentation"), item("data-analysis", "Reproducible data analysis"),
  item("model-evaluation", "Model evaluation"), item("dashboard", "Interactive dashboard"), item("audit-report", "Audit report"),
  item("engineering-simulation", "Engineering simulation"), item("physical-prototype", "Physical prototype"),
  item("financial-model", "Financial model"), item("presentation-deck", "Presentation deck"), item("strategy-memo", "Strategy memo"),
  item("research-report", "Research report"), item("design-case-study", "Design case study"), item("interactive-prototype", "Interactive prototype"),
  item("accessibility-audit", "Accessibility audit"), item("educational-module", "Educational module"), item("published-article", "Publishable article"),
  item("produced-video", "Produced video"), item("operations-case-study", "Operations case study"), item("spreadsheet-model", "Spreadsheet model"),
] as const;

export const requiredTools = [
  item("browser", "Modern web browser"), item("git-github", "Git and GitHub"), item("python", "Python"), item("jupyter", "Jupyter Notebook"),
  item("react-node", "React and Node.js"), item("node-express", "Node.js and Express"), item("postgresql", "PostgreSQL"), item("nextjs-astro", "Next.js or Astro"), item("postman", "Postman"),
  item("pandas-sklearn", "Pandas and scikit-learn"), item("nlp-library", "NLTK or TextBlob"), item("fairness-library", "Fairlearn or AIF360"),
  item("spreadsheet", "Excel or Google Sheets"), item("burp-suite", "Burp Suite Community"), item("wireshark", "Wireshark"),
  item("fpga-toolchain", "EDA Playground or Verilator (free)"), item("fpga-board", "FPGA board (optional if simulating)"), item("arduino-kit", "Arduino and basic sensor kit"), item("arduino-or-simulator", "Arduino IDE or Wokwi browser simulation"),
  item("ltspice", "LTspice"), item("matlab-octave", "MATLAB or GNU Octave (free fallback)"), item("cad-software", "FreeCAD"), item("3d-printer", "3D printer access"),
  item("fea-software", "SimScale Community (free) or Ansys Student"), item("autocad", "FreeCAD or LibreCAD"), item("free-cad-librecad", "FreeCAD or LibreCAD"), item("project-scheduler", "ProjectLibre (free)"),
  item("takeoff-software", "LibreOffice Draw and Calc"), item("presentation-software", "Presentation software"), item("canva", "Canva"),
  item("tableau-public", "Tableau Public"), item("survey-tool", "Online survey tool"), item("legal-research", "Public legal research database"),
  item("figma", "Figma"), item("accessibility-tools", "axe-core or Lighthouse"), item("publishing-platform", "Public publishing platform"),
  item("camera", "Phone or camera"), item("video-editor", "Clipchamp or DaVinci Resolve (free)"), item("diagramming-tool", "Diagramming or layout tool"),
] as const;

export const accessRequirements = [
  item("computer-internet", "Computer and reliable internet"), item("free-cloud-account", "Free hosting or cloud account"),
  item("public-dataset", "Public dataset access"), item("local-software-install", "Permission to install local software"),
  item("hardware-required", "Required physical hardware"), item("hardware-or-simulation", "Hardware or simulation alternative"),
  item("education-or-trial-license", "Education, trial, or paid software license"), item("physical-site", "Safe access to a physical site"),
  item("public-company-filings", "Public company filings"), item("public-market-data", "Public market data"),
  item("participant-recruitment", "Consent-based participant recruitment"), item("participant-or-heuristic", "Consent-based participants or a documented heuristic fallback"), item("public-sources", "Public research sources"),
  item("source-interviews", "Consent-based source interviews"), item("camera-access", "Camera and recording permission"),
] as const;

export const experienceLevels = [item("BEGINNER", "Beginner"), item("INTERMEDIATE", "Intermediate"), item("ADVANCED", "Advanced")] as const;

export const careerReviewerExpertise = [
  item("early-career-hiring", "Early-career hiring"), item("university-recruiting", "University recruiting"),
  item("career-coaching", "Career coaching"), item("portfolio-review", "Portfolio review"), item("technical-recruiting", "Technical recruiting"),
] as const;

export const careerTaxonomy = {
  version: CAREER_TAXONOMY_VERSION,
  domains: careerDomains,
  roles: careerRoles,
  competencies: careerCompetencies,
  portfolioSignals,
  requiredTools,
  accessRequirements,
  experienceLevels,
  careerReviewerExpertise,
};

export type ProjectCareerMapping = {
  targetRoleIds: string[];
  competencyIds: string[];
  portfolioSignalIds: string[];
  requiredToolIds: string[];
  accessRequirementIds: string[];
  recommendedExperienceLevels: string[];
  careerTaxonomyVersion: string;
};

const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim();

function aliasIndex(items: readonly CareerTaxonomyItem[]) {
  return new Map(items.flatMap((entry) => [entry.label, entry.id, ...(entry.aliases ?? [])].map((alias) => [normalized(alias), entry.id] as const)));
}

const roleAliasIndex = aliasIndex(careerRoles);
const competencyAliasIndex = aliasIndex(careerCompetencies);

export function resolveRoleIds(values: readonly string[]) {
  return [...new Set(values.flatMap((value) => {
    const exact = roleAliasIndex.get(normalized(value));
    if (exact) return [exact];
    const query = normalized(value);
    return careerRoles.filter((role) => query.includes(normalized(role.label)) || normalized(role.label).includes(query)).map((role) => role.id);
  }))];
}

export function resolveCompetencyIds(values: readonly string[]) {
  return [...new Set(values.flatMap((value) => {
    const exact = competencyAliasIndex.get(normalized(value));
    if (exact) return [exact];
    const query = normalized(value);
    return careerCompetencies.filter((entry) => query.includes(normalized(entry.label)) || normalized(entry.label).includes(query)).map((entry) => entry.id);
  }))];
}

export function roleDomainIds(roleIds: readonly string[]) {
  return [...new Set(roleIds.map((roleId) => careerRoles.find((role) => role.id === roleId)?.domainId).filter((value): value is string => Boolean(value)))];
}

export function taxonomyLabel(kind: keyof Pick<typeof careerTaxonomy, "roles" | "competencies" | "portfolioSignals" | "requiredTools" | "accessRequirements" | "experienceLevels">, id: string) {
  return careerTaxonomy[kind].find((entry) => entry.id === id)?.label ?? id;
}
