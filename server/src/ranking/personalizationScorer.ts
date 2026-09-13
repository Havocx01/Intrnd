import type {
  AvailableProject,
  CompactRankProjectsRequest,
  InternalMatchDetails,
  PersonalizationFactor,
  PersonalizationFactorKey,
} from "./types.js";
import { careerRoles, resolveCompetencyIds, resolveRoleIds, roleDomainIds, taxonomyLabel } from "../career/taxonomy.js";

export const PERSONALIZATION_FACTOR_WEIGHTS: Readonly<Record<PersonalizationFactorKey, number>> = {
  field: 25,
  major: 12,
  role: 15,
  outcome: 10,
  experience: 10,
  skills: 8,
  niche: 7,
  environment: 5,
  time: 4,
  proof: 4,
};

const FIELD_GROUPS: Record<string, string[]> = {
  business: [
    "finance",
    "business",
    "accounting",
    "management",
    "marketing",
    "economics",
    "entrepreneurship",
    "operations",
    "consulting",
    "retail",
    "real estate",
    "investment",
    "valuation",
    "financial",
  ],
  tech: [
    "tech",
    "software",
    "computer science",
    "computer engineering",
    "data",
    "ai",
    "machine learning",
    "cybersecurity",
    "web",
    "api",
    "python",
    "javascript",
  ],
  engineering: [
    "mechanical engineering",
    "electrical engineering",
    "robotics",
    "manufacturing",
    "aerospace",
    "energy systems",
    "mechatronics",
    "civil",
    "construction",
  ],
  healthcare: ["healthcare", "health", "public health", "clinical", "patient", "medical", "biology", "biotechnology"],
  legal: ["legal", "law", "policy", "public sector", "government", "civic", "political science"],
  design: ["design", "ux", "ui", "product design", "visual", "accessibility"],
  education: ["education", "teaching", "learning", "curriculum", "student success"],
  media: ["media", "communications", "journalism", "content", "public relations"],
  social_science: ["psychology", "behavioral science", "social science", "human behavior", "research"],
};

const ADJACENT_GROUPS: Record<string, string[]> = {
  business: ["tech", "design"],
  tech: ["engineering", "design", "business"],
  engineering: ["tech", "business"],
  healthcare: ["social_science", "tech", "business"],
  legal: ["social_science", "business", "media"],
  design: ["tech", "media", "business"],
  education: ["social_science", "media", "tech"],
  media: ["design", "business", "social_science"],
  social_science: ["healthcare", "education", "legal", "business"],
};

const OUTCOME_SIGNALS: Record<string, string[]> = {
  resume: ["review", "verified", "report", "repository", "github", "portfolio", "demo", "case study"],
  portfolio: ["portfolio", "case study", "demo", "deployed", "github", "repository", "presentation", "dashboard"],
  internship: ["review", "verified", "stakeholder", "client", "github", "report", "presentation", "demo"],
  competition: ["competition", "challenge", "pitch", "submission", "presentation", "analysis"],
  skill: ["github", "repository", "demo", "dashboard", "model", "analysis", "prototype", "report"],
};

const SPECIALIZATION_RULES = [
  {
    profile: /backend|software engineering|full[- ]?stack|web development|app development/,
    positive: /api|backend|server|database|sql|web app|application|microservice|docker|ci\/cd|command line|\bcli\b|automation|software/,
    conflict: /arduino|sensor|firmware|embedded|circuit|electrical|mechanical|\biot\b|rtl-sdr|radio|robotics/,
  },
  {
    profile: /ai\/ml|machine learning|artificial intelligence|nlp|computer vision/,
    positive: /machine learning|\bai\b|\bml\b|model|dataset|prediction|classifier|nlp|computer vision|evaluation|fine[- ]?tun|lora/,
    conflict: /accounting|\bvaluation\b|construction|supply chain|legal memo/,
  },
  {
    profile: /data science|data analytics|business analytics|data product/,
    positive: /data|analytics|dashboard|sql|dataset|visualization|forecast|experiment|kpi|statistical/,
    conflict: /embedded|firmware|circuit|mechanical design|legal research/,
  },
  {
    profile: /cybersecurity|security analyst|cloud security|threat/,
    positive: /security|threat|vulnerability|access control|identity|network|monitoring|incident|cloud/,
    conflict: /marketing campaign|valuation|mechanical|construction schedule/,
  },
  {
    profile: /computer engineering|embedded|firmware|hardware|computer architecture/,
    positive: /embedded|firmware|hardware|sensor|arduino|raspberry|circuit|iot|architecture|fpga|microcontroller/,
    conflict: /marketing|legal memo|human resources|content calendar/,
  },
  {
    profile: /investment banking|private equity|corporate finance|accounting|valuation|financial/,
    positive: /finance|financial|valuation|dcf|lbo|investment|portfolio|accounting|budget|forecast|equity|market/,
    conflict: /arduino|firmware|embedded|browser extension|cybersecurity|mechanical/,
  },
  {
    profile: /marketing|brand|growth|consumer|campaign/,
    positive: /marketing|brand|campaign|audience|consumer|content|social media|growth|segmentation|survey/,
    conflict: /firmware|embedded|valuation model|construction schedule/,
  },
  {
    profile: /ux|user experience|product design|interaction design|accessibility|visual design/,
    positive: /ux|user research|usability|design|prototype|wireframe|accessibility|interface|journey|figma/,
    conflict: /valuation|accounting|firmware|supply chain/,
  },
  {
    profile: /healthcare|public health|clinical|patient|health equity/,
    positive: /health|patient|clinical|care|public health|program evaluation|workflow|community/,
    conflict: /investment banking|embedded firmware|construction cost/,
  },
  {
    profile: /legal|public policy|public sector|government|policy analyst/,
    positive: /legal|policy|government|public|regulation|compliance|stakeholder|program evaluation|civic/,
    conflict: /firmware|mechanical design|marketing campaign/,
  },
];

const IGNORED_TOKENS = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "into",
  "this",
  "that",
  "student",
  "project",
  "projects",
  "intern",
  "internship",
  "analyst",
  "engineer",
  "assistant",
  "beginner",
  "intermediate",
  "advanced",
  "resume",
  "portfolio",
  "experience",
]);

type FactorInput = { key: PersonalizationFactorKey; label: string; ratio: number; detail: string; active?: boolean };

export type PersonalizationScore = { score: number; details: InternalMatchDetails };

export function scoreProjectPersonalization(project: AvailableProject, input: CompactRankProjectsRequest): PersonalizationScore {
  const profile = input.student_profile;
  const projectHaystack = projectText(project);
  const major = firstText(profile.major, profile.academic_major);
  const field = firstText(profile.target_field, profile.field_of_interest, profile.field, profile.careerInterests);
  const roles = values(profile.target_roles, profile.targetRoles);
  const outcome = firstText(profile.desired_outcome, profile.project_preferences, profile.preferred_project_type);
  const experience = experienceValue(firstText(profile.experience_level));
  const skills = values(profile.skills_to_build, profile.skillsToBuild).filter((value) => !isOutcomeValue(value));
  const niches = values(profile.niche_interests, profile.nicheInterests);
  const environments = values(profile.target_companies, profile.targetCompanies);
  const availability = firstText(profile.available_time_per_week, profile.available_time, profile.weekly_time);

  const fieldRatio = alignmentRatio(field, projectHaystack, text(project.target_field));
  const majorRatio = alignmentRatio(major, projectHaystack, text(project.target_field));
  const roleRatio = canonicalRoleMatchRatio(roles, project.role_ids, projectHaystack);
  const skillRatio = canonicalCompetencyMatchRatio(skills, project.competency_ids, projectHaystack);
  const nicheRatio = tokenMatchRatio(niches, projectHaystack, 2);
  const environmentRatio = environmentMatchRatio(environments, major, projectHaystack);
  const outcomeRatio = outcomeMatchRatio(outcome, projectHaystack);
  const experienceRatio = experienceMatchRatio(
    experience,
    values(project.recommended_experience_levels).join(" ") || text(project.difficulty),
  );
  const timeRatio = timeMatchRatio(availability, text(project.estimated_time));
  const proofRatio = projectValueRatio(project);
  const specialization = specializationFit([field, ...roles, ...niches].join(" "), projectHaystack);
  const adjustedFieldRatio = fieldRatio * specialization;
  const adjustedRoleRatio = project.role_ids?.length ? roleRatio : roleRatio * specialization;

  const factorInputs: FactorInput[] = [
    { key: "field", label: "Field", ratio: adjustedFieldRatio, detail: field ? `${field} focus` : "", active: Boolean(field) },
    { key: "major", label: "Major", ratio: majorRatio, detail: major ? `${major} academic path` : "", active: Boolean(major) },
    { key: "role", label: "Target role", ratio: adjustedRoleRatio, detail: roles[0] ? `${roles[0]} goal` : "", active: roles.length > 0 },
    {
      key: "outcome",
      label: "Desired outcome",
      ratio: outcomeRatio,
      detail: outcome ? `${outcome} outcome` : "",
      active: Boolean(outcome),
    },
    {
      key: "experience",
      label: "Experience",
      ratio: experienceRatio,
      detail: experience ? `${experience} difficulty fit` : "",
      active: Boolean(experience),
    },
    {
      key: "skills",
      label: "Skills to build",
      ratio: skillRatio,
      detail: matchingValues(skills, projectHaystack)[0] ? `${matchingValues(skills, projectHaystack)[0]} skill growth` : "",
      active: skills.length > 0,
    },
    {
      key: "niche",
      label: "Niche interest",
      ratio: nicheRatio,
      detail: matchingValues(niches, projectHaystack)[0] ? `${matchingValues(niches, projectHaystack)[0]} interest` : "",
      active: niches.length > 0,
    },
    {
      key: "environment",
      label: "Target environment",
      ratio: environmentRatio,
      detail: environments[0] ? `${environments[0]}-aligned environment` : "",
      active: environments.length > 0,
    },
    {
      key: "time",
      label: "Available time",
      ratio: timeRatio,
      detail: availability ? `${availability} availability` : "",
      active: Boolean(availability),
    },
    { key: "proof", label: "Career proof", ratio: proofRatio, detail: proofDetail(project), active: true },
  ];

  const factors = factorInputs.filter((factor) => factor.active).map(toFactor);
  const activeWeight = factors.reduce((total, factor) => total + factor.maxScore, 0);
  const earned = factors.reduce((total, factor) => total + factor.score, 0);
  const score = activeWeight > 0 ? Math.min(96, Math.round((earned / activeWeight) * 100)) : 35;
  const matchedOn = factors
    .filter(
      (factor) => factor.score >= factor.maxScore * (factor.key === "environment" ? 0.8 : 0.55) && factor.key !== "proof" && factor.detail,
    )
    .sort((a, b) => b.score / b.maxScore - a.score / a.maxScore || b.maxScore - a.maxScore)
    .slice(0, 3)
    .map((factor) => factor.detail);
  const projectSkills = project.competency_ids?.length
    ? project.competency_ids.slice(0, 3).map((id) => taxonomyLabel("competencies", id))
    : stringList(project.skills_learned).slice(0, 3);
  const deliverable = stringList(project.deliverables)[0] || "a reviewable project artifact";
  const portfolioSignal = project.portfolio_signal_ids?.[0]
    ? taxonomyLabel("portfolioSignals", project.portfolio_signal_ids[0]).toLowerCase()
    : null;

  return {
    score,
    details: {
      matchedOn,
      builds: projectSkills,
      outcome: `Creates ${lowerFirst(deliverable)}${portfolioSignal ? ` as ${withArticle(portfolioSignal)}` : ""}.`,
      whyNow: experienceWhyNow(experience, text(project.difficulty)),
      factors,
    },
  };
}

export function buildPersonalizedReason(
  project: AvailableProject,
  input: CompactRankProjectsRequest,
  details: InternalMatchDetails,
): string {
  const primary = details.matchedOn.slice(0, 2);
  const skills = details.builds.slice(0, 2);
  const matchSentence = primary.length
    ? `Matches your ${joinNatural(primary)}.`
    : `Fits your saved academic direction and current experience level.`;
  const valueSentence = skills.length
    ? `You’ll build ${joinNatural(skills)} and produce ${lowerFirst(stringList(project.deliverables)[0] || "reviewable career proof")}.`
    : details.outcome;
  return `${matchSentence} ${valueSentence}`;
}

export function personalizationReasonCodes(details: InternalMatchDetails): string[] {
  const labels: Record<PersonalizationFactorKey, string> = {
    field: "FIELD_ALIGNMENT",
    major: "MAJOR_ALIGNMENT",
    role: "ROLE_ALIGNMENT",
    outcome: "OUTCOME_ALIGNMENT",
    experience: "DIFFICULTY_FIT",
    skills: "SKILL_BUILDING",
    niche: "NICHE_ALIGNMENT",
    environment: "ENVIRONMENT_ALIGNMENT",
    time: "TIME_FIT",
    proof: "PROOF_VALUE",
  };
  return details.factors
    .filter((factor) => factor.score >= factor.maxScore * 0.55)
    .sort((a, b) => b.score - a.score)
    .map((factor) => labels[factor.key])
    .slice(0, 5);
}

function toFactor(input: FactorInput): PersonalizationFactor {
  const maxScore = PERSONALIZATION_FACTOR_WEIGHTS[input.key];
  return {
    key: input.key,
    label: input.label,
    score: Number((clamp01(input.ratio) * maxScore).toFixed(1)),
    maxScore,
    detail: input.detail,
  };
}

function alignmentRatio(profileValue: string, haystack: string, projectField: string): number {
  if (!profileValue) return 0;
  const normalized = profileValue.toLowerCase();
  const directTokens = tokens(normalized);
  if (projectField && (normalized.includes(projectField.toLowerCase()) || projectField.toLowerCase().includes(normalized))) return 1;
  const directMatches = directTokens.filter((token) => haystack.includes(token)).length;
  if (directTokens.length && directMatches / directTokens.length >= 0.5) return 0.92;
  if (directMatches > 0) return 0.65;
  const profileGroup = detectFieldGroup(normalized);
  const projectGroup = detectFieldGroup(`${projectField} ${haystack}`);
  if (profileGroup && projectGroup === profileGroup) return 0.48;
  if (profileGroup && projectGroup && (ADJACENT_GROUPS[profileGroup] ?? []).includes(projectGroup)) return 0.24;
  return 0;
}

function specializationFit(profileText: string, projectHaystack: string): number {
  const rule = SPECIALIZATION_RULES.find((candidate) => candidate.profile.test(profileText.toLowerCase()));
  if (!rule) return 1;
  if (rule.conflict.test(projectHaystack)) return 0.12;
  if (rule.positive.test(projectHaystack)) return 1;
  return 0.45;
}

function tokenMatchRatio(profileValues: string[], haystack: string, fullMatchCount: number): number {
  const signalTokens = profileValues.flatMap(tokens);
  if (!signalTokens.length) return 0;
  const matches = signalTokens.filter((token) => haystack.includes(token)).length;
  return clamp01(matches / Math.min(fullMatchCount, signalTokens.length));
}

function canonicalRoleMatchRatio(profileValues: string[], projectRoleIds: string[] | null | undefined, haystack: string): number {
  if (!projectRoleIds?.length) return tokenMatchRatio(profileValues, haystack, 2);
  const profileRoleIds = resolveRoleIds(profileValues);
  if (!profileRoleIds.length) return 0;
  if (profileRoleIds.some((roleId) => projectRoleIds.includes(roleId))) return 1;
  const related = profileRoleIds.some((profileRoleId) => {
    const role = careerRoles.find((entry) => entry.id === profileRoleId);
    return (role?.relatedRoleIds ?? []).some((roleId) => projectRoleIds.includes(roleId));
  });
  if (related) return 0.65;
  return roleDomainIds(profileRoleIds).some((domainId) => roleDomainIds(projectRoleIds).includes(domainId)) ? 0.35 : 0;
}

function canonicalCompetencyMatchRatio(
  profileValues: string[],
  projectCompetencyIds: string[] | null | undefined,
  haystack: string,
): number {
  if (!projectCompetencyIds?.length) return tokenMatchRatio(profileValues, haystack, 2);
  const desiredIds = resolveCompetencyIds(profileValues);
  if (!desiredIds.length) return tokenMatchRatio(profileValues, haystack, 2);
  const matches = desiredIds.filter((id) => projectCompetencyIds.includes(id)).length;
  return clamp01(matches / Math.min(2, desiredIds.length));
}

function environmentMatchRatio(environments: string[], major: string, haystack: string): number {
  if (!environments.length) return 0;
  if (matchingValues(environments, haystack).length) return 1;
  const majorGroup = detectFieldGroup(major);
  const projectGroup = detectFieldGroup(haystack);
  return majorGroup && projectGroup === majorGroup ? 0.55 : 0;
}

function outcomeMatchRatio(outcome: string, haystack: string): number {
  if (!outcome) return 0;
  const normalized = outcome.toLowerCase();
  const group = Object.keys(OUTCOME_SIGNALS).find((key) => normalized.includes(key));
  const signals = group ? OUTCOME_SIGNALS[group] : tokens(normalized);
  const matches = signals.filter((signal) => haystack.includes(signal)).length;
  return matches ? Math.min(1, 0.45 + matches * 0.18) : 0.25;
}

function experienceMatchRatio(experience: string, difficulty: string): number {
  const level = levelIndex(experience);
  const projectLevel = levelIndex(difficulty);
  if (level === null || projectLevel === null) return 0.55;
  const difference = projectLevel - level;
  if (difference === 0) return 1;
  if (difference === -1) return 0.75;
  if (difference === 1) return level === 0 ? 0.25 : 0.5;
  return difference < 0 ? 0.45 : 0.1;
}

function timeMatchRatio(availability: string, estimate: string): number {
  if (!availability) return 0;
  const availableHours = Number(availability.match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
  if (!availableHours) return 0.5;
  const duration = Number(estimate.match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
  if (!duration) return 0.5;
  if (/hour|day/.test(estimate.toLowerCase())) return 1;
  if (/week/.test(estimate.toLowerCase()) && availableHours <= 4 && duration >= 6) return 0.2;
  if (/week/.test(estimate.toLowerCase()) && availableHours <= 6 && duration >= 4) return 0.55;
  return 0.9;
}

function projectValueRatio(project: AvailableProject): number {
  const resume = numeric(project.resume_value_1_10, 5);
  const portfolio = numeric(project.portfolio_value_1_10, 5);
  const proof = /github|demo|deployed|review|verified|report|dashboard|presentation|portfolio/i.test(projectText(project)) ? 1 : 0.55;
  return clamp01(((resume + portfolio) / 20) * 0.75 + proof * 0.25);
}

function proofDetail(project: AvailableProject): string {
  const signal = project.portfolio_signal_ids?.[0];
  if (signal) return `${taxonomyLabel("portfolioSignals", signal)} proof`;
  const deliverable = stringList(project.deliverables)[0];
  return deliverable ? `${deliverable} proof` : "Reviewable career proof";
}

function withArticle(value: string) {
  return `${/^[aeiou]/i.test(value) ? "an" : "a"} ${value}`;
}

function experienceWhyNow(experience: string, difficulty: string): string {
  const level = levelIndex(experience);
  const projectLevel = levelIndex(difficulty);
  if (level === null || projectLevel === null) return "The scope can be adjusted to your current level.";
  if (projectLevel === level) return `The ${difficulty.toLowerCase()} scope matches your current experience.`;
  if (projectLevel === level + 1) return "This is a manageable stretch from your current experience level.";
  if (projectLevel < level) return "This should be achievable while still producing useful proof.";
  return "This is a stretch project and may require additional preparation.";
}

function projectText(project: AvailableProject): string {
  return [
    project.target_field,
    project.project_title,
    project.career_signal,
    project.skills_learned,
    project.deliverables,
    project.verification_type,
    project.source_type,
  ]
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");
}

function detectFieldGroup(value: string): string | null {
  const normalized = value.toLowerCase();
  return (
    Object.entries(FIELD_GROUPS)
      .map(([group, keywords]) => ({ group, matches: keywords.filter((keyword) => normalized.includes(keyword)).length }))
      .filter((entry) => entry.matches > 0)
      .sort((a, b) => b.matches - a.matches)[0]?.group ?? null
  );
}

function matchingValues(items: string[], haystack: string): string[] {
  return items.filter((item) => tokens(item).some((token) => haystack.includes(token)));
}

function tokens(value: string): string[] {
  return Array.from(
    new Set(
      value
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/)
        .map((token) => token.trim())
        .filter((token) => (token.length >= 3 || ["ai", "ml", "ux", "ui", "hr"].includes(token)) && !IGNORED_TOKENS.has(token)),
    ),
  );
}

function values(...raw: unknown[]): string[] {
  return raw
    .flatMap((value) => {
      if (Array.isArray(value)) return value.map(String);
      if (typeof value !== "string" && typeof value !== "number") return [];
      return String(value).split(/[,;|]/);
    })
    .map((value) => value.trim())
    .filter(Boolean);
}

function stringList(value: unknown): string[] {
  return values(value);
}

function firstText(...values: unknown[]): string {
  return values.map(text).find(Boolean) ?? "";
}

function text(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function numeric(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function levelIndex(value: string): number | null {
  const normalized = value.toLowerCase();
  if (/beginner|entry|new/.test(normalized)) return 0;
  if (/intermediate|some experience/.test(normalized)) return 1;
  if (/advanced|expert|experienced/.test(normalized)) return 2;
  return null;
}

function experienceValue(value: string): string {
  return levelIndex(value) === null ? "" : value;
}

function isOutcomeValue(value: string): boolean {
  return /resume|portfolio|internship|competition|skill proof/i.test(value);
}

function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function joinNatural(values: string[]): string {
  if (values.length <= 1) return values[0] ?? "";
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
