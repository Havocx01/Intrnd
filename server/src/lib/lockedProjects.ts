// Return only teaser fields for locked recommendations.

const PLANS_WITH_FULL_RECOMMENDATIONS = new Set(["PRO", "PRO_PLUS"]);

export function hasFullRecommendationAccess(plan: string | null | undefined): boolean {
  if (!plan) return false;
  return PLANS_WITH_FULL_RECOMMENDATIONS.has(plan.toUpperCase());
}

// Match the client's first saved recommendation without changing ranking order.

export function pickFreeStarterId(candidates: ReadonlyArray<{ id: string }>): string | null {
  return candidates[0]?.id ?? null;
}

// Build teaser titles from category, difficulty, and source without exposing the brief.
function classifyDomain(haystack: string, deliverable: string): string {
  const has = (...needles: string[]) => needles.some((needle) => haystack.includes(needle));
  const hasDeliverable = (...needles: string[]) => needles.some((needle) => deliverable.includes(needle));

  if (has("cyber", "security", "infosec", "appsec", "netsec")) {
    return "Cybersecurity";
  }
  if (
    has("machine learning", "deep learning", "nlp", "computer vision", "mlops", "llm", "artificial intelligence") ||
    /(^|[^a-z])ai([^a-z]|$)/.test(haystack)
  ) {
    return "AI";
  }
  if (has("web", "frontend", "front-end", "front end", "fullstack", "full-stack", "full stack")) {
    return "Web Development";
  }
  if (has("data", "analytics", "analyst", "bi ", "statistics")) {
    // Distinguish dashboards and reports from heavy data engineering.
    if (hasDeliverable("dashboard", "report", "analysis", "insight")) {
      return "Data Analysis";
    }
    return "Data";
  }
  if (has("automation", "workflow", "rpa") || hasDeliverable("automation", "script", "bot", "pipeline")) {
    return "Automation";
  }
  if (has("mobile", "ios", "android")) return "Mobile";
  if (has("design", "ux", "product design")) return "Design";
  if (has("hardware", "embedded", "robotics", "iot")) return "Hardware";
  if (has("research", "lab")) return "Research";
  if (has("business", "marketing", "product management", "operations", "finance")) {
    return "Business";
  }
  if (has("software", "backend", "engineering", "devops", "cloud")) {
    return "Software";
  }
  return "Portfolio";
}

function classifyNoun(sourceType: string | null | undefined): string {
  switch ((sourceType ?? "").toUpperCase()) {
    case "INTRND_CREATED":
    case "AI_GENERATED":
      return "Build";
    case "ON_CAMPUS":
    case "UNIVERSITY":
      return "Course Project";
    case "COMMUNITY":
      return "Community Project";
    case "COMPETITION":
      return "Challenge";
    case "RESEARCH_STYLE":
      return "Research Project";
    case "LOCAL_BUSINESS":
      return "Business Project";
    case "ORGANIZATION_POSTED":
      return "Industry Project";
    case "STUDENT_SUBMITTED":
      return "Showcase";
    case "BETA_EXAMPLE":
      return "Capstone";
    case "THIRD_PARTY":
      return "Challenge";
    default:
      return "Project";
  }
}

function classifyDifficulty(difficulty: string | null | undefined): string | null {
  switch ((difficulty ?? "").toUpperCase()) {
    case "BEGINNER":
      return "Beginner";
    case "INTERMEDIATE":
      return "Intermediate";
    case "ADVANCED":
      return "Advanced";
    default:
      return null;
  }
}

export function lockedTeaserTitle(
  category: string | null | undefined,
  sourceType?: string | null,
  difficulty?: string | null,
  deliverable?: string | null,
): string {
  const haystack = `${category ?? ""} ${sourceType ?? ""}`.toLowerCase();
  const deliverableHaystack = (deliverable ?? "").toLowerCase();
  const domain = classifyDomain(haystack, deliverableHaystack);
  const noun = classifyNoun(sourceType);
  const diff = classifyDifficulty(difficulty);
  const parts = ["Locked", diff, domain, noun].filter(Boolean);
  return parts.join(" ");
}

type SanitizableProject = {
  id: string;
  title: string;
  description: string;
  organizationName: string | null;
  schoolName?: string | null;
  externalUrl?: string | null;
  applicationInstructions?: string | null;
  category: string | null;
  sourceType: string;
  difficulty?: string | null;
  majorTags: string[];
  interestTags: string[];
  skillTags: string[];
  deliverable: string | null;
  skills: string[];
  verificationType: string | null;
  verificationMethod: string | null;
  matchBand?: string;
  recommendationLabel?: string;
  recommendationReason?: string;
  matchDetails?: unknown;
  roadmapPreview?: unknown;
};

function lockedDeliverableType(deliverable: string | null | undefined): string {
  const value = (deliverable ?? "").toLowerCase();
  if (/dashboard|data|analysis|workbook|model/.test(value)) {
    return "Analysis artifact";
  }
  if (/report|memo|brief|document|write-up/.test(value)) {
    return "Written artifact";
  }
  if (/presentation|slide|deck/.test(value)) return "Presentation";
  if (/design|wireframe|prototype|mockup/.test(value)) {
    return "Design artifact";
  }
  if (/page|site|web app|website/.test(value)) return "Web artifact";
  if (/repository|github|code|api|script|automation/.test(value)) {
    return "Technical artifact";
  }
  if (/video|demo|recording/.test(value)) return "Recorded demonstration";
  return "Project artifact";
}

function lockedFitDescription(matchBand: string | undefined): string {
  if (matchBand === "STRONG") {
    return "A strong-fit project selected for your goals and current experience level.";
  }
  if (matchBand === "GOOD") {
    return "A good-fit project selected from your personalized ranking.";
  }
  return "A project worth exploring based on your saved profile.";
}

// Keep the API field shape stable while replacing restricted details.
export function sanitizeLockedProject<T extends SanitizableProject>(
  project: T,
): T & {
  locked: true;
  matchLabel: string;
  lockedPreview: { title: string; description: string; deliverable: string | null; skills: string[] };
} {
  // Build the teaser before clearing the original fields.
  const teaserTitle = lockedTeaserTitle(project.category, project.sourceType, project.difficulty, project.deliverable);

  const lockedPreview = {
    title: teaserTitle.replace(/^Locked\s+/i, ""),
    description: lockedFitDescription(project.matchBand),
    deliverable: lockedDeliverableType(project.deliverable),
    skills: [],
  };

  return {
    ...project,
    title: teaserTitle,
    description: "",
    organizationName: null,
    schoolName: null,
    externalUrl: null,
    applicationInstructions: null,
    majorTags: [],
    interestTags: [],
    skillTags: [],
    deliverable: null,
    skills: [],
    verificationType: null,
    verificationMethod: null,
    recommendationLabel: "",
    recommendationReason: "",
    matchDetails: undefined,
    roadmapPreview: undefined,
    lockedPreview,
    locked: true,
    matchLabel: project.matchBand === "STRONG" ? "Strong match" : project.matchBand === "GOOD" ? "Good match" : "Exploratory match",
  };
}
