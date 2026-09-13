import { createHash } from "node:crypto";
import type { RoadmapSupportLevel } from "../roadmaps/types.js";

export const PROFILE_FEATURE_VERSION = "profile-v1" as const;

export type SavedStudentProfile = {
  major?: string | null;
  careerInterests?: string | null;
  targetRoles?: string | null;
  targetCompanies?: string | null;
  nicheInterests?: string | null;
  experienceLevel?: string | null;
  currentSkills?: string | null;
  skillsToBuild?: string | null;
  projectPreferences?: string | null;
  resumeStrength?: number | null;
  roadmapDefaults?: unknown;
} | null;

export type NormalizedProfileFeatures = {
  major: string | null;
  careerInterests: string[];
  targetRoles: string[];
  targetCompanies: string[];
  nicheInterests: string[];
  experienceLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
  currentSkills: string[];
  desiredSkills: string[];
  projectPreferences: string[];
  resumeStrength: number | null;
  weeklyHours: number;
  supportLevel: RoadmapSupportLevel;
};

export type ProfileFeatureSnapshot = {
  profileFeatureVersion: typeof PROFILE_FEATURE_VERSION;
  profileHash: string;
  features: NormalizedProfileFeatures;
};

const SKILL_ALIASES: Record<string, string> = {
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  postgres: "postgresql",
  postgresql: "postgresql",
  "rest api": "rest api",
  rest: "rest api",
  api: "rest api",
  ux: "user experience",
  "user experience": "user experience",
  ui: "user interface",
  "user interface": "user interface",
  ml: "machine learning",
  "machine learning": "machine learning",
  ai: "artificial intelligence",
  "artificial intelligence": "artificial intelligence",
  excel: "microsoft excel",
  "microsoft excel": "microsoft excel",
  gcp: "google cloud",
  "google cloud platform": "google cloud",
  aws: "amazon web services",
  "amazon web services": "amazon web services",
};

export function buildProfileFeatures(profile: SavedStudentProfile): ProfileFeatureSnapshot {
  const defaults = roadmapDefaults(profile?.roadmapDefaults);
  const features: NormalizedProfileFeatures = {
    major: normalizeText(profile?.major) || null,
    careerInterests: normalizeList(profile?.careerInterests),
    targetRoles: normalizeList(profile?.targetRoles),
    targetCompanies: normalizeList(profile?.targetCompanies),
    nicheInterests: normalizeList(profile?.nicheInterests),
    experienceLevel: normalizeExperienceLevel(profile?.experienceLevel),
    currentSkills: normalizeSkillList(profile?.currentSkills),
    desiredSkills: normalizeSkillList(profile?.skillsToBuild),
    projectPreferences: normalizeList(profile?.projectPreferences),
    resumeStrength: normalizeResumeStrength(profile?.resumeStrength),
    weeklyHours: defaults.weeklyHours,
    supportLevel: defaults.supportLevel,
  };
  const canonical = stableValue(features);
  return {
    profileFeatureVersion: PROFILE_FEATURE_VERSION,
    profileHash: createHash("sha256").update(JSON.stringify(canonical)).digest("hex"),
    features,
  };
}

export function normalizeSkill(value: string): string {
  const normalized = normalizeText(value);
  return SKILL_ALIASES[normalized] ?? normalized;
}

export function skillMatches(knownSkills: string[], requiredSkill: string): boolean {
  const required = normalizeSkill(requiredSkill);
  return knownSkills.some((skill) => {
    const known = normalizeSkill(skill);
    return known === required || phraseContains(known, required) || phraseContains(required, known);
  });
}

export function normalizedProfileContext(features: NormalizedProfileFeatures) {
  return {
    currentSkills: [...features.currentSkills],
    desiredSkills: [...features.desiredSkills],
    targetRoles: [...features.targetRoles],
    projectPreferences: [...features.projectPreferences],
  };
}

function normalizeList(value: unknown): string[] {
  if (typeof value !== "string") return [];
  const seen = new Set<string>();
  return value
    .split(/[,;|\n]/)
    .map(normalizeText)
    .filter((entry) => {
      if (!entry || seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
}

function normalizeSkillList(value: unknown): string[] {
  const seen = new Set<string>();
  return normalizeList(value)
    .map(normalizeSkill)
    .filter((entry) => {
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US") : "";
}

function roadmapDefaults(value: unknown): { weeklyHours: number; supportLevel: RoadmapSupportLevel } {
  const candidate = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const weeklyHours = Number(candidate.weeklyHours);
  const supportLevel = String(candidate.supportLevel ?? "STANDARD").toUpperCase();
  return {
    weeklyHours: Number.isInteger(weeklyHours) && weeklyHours >= 1 && weeklyHours <= 40 ? weeklyHours : 5,
    supportLevel: (["GUIDED", "STANDARD", "ACCELERATED"] as const).includes(supportLevel as RoadmapSupportLevel)
      ? (supportLevel as RoadmapSupportLevel)
      : "STANDARD",
  };
}

function normalizeResumeStrength(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : null;
}

function normalizeExperienceLevel(value: unknown): "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null {
  const normalized = normalizeText(value).toUpperCase();
  return (["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).includes(normalized as "BEGINNER" | "INTERMEDIATE" | "ADVANCED")
    ? (normalized as "BEGINNER" | "INTERMEDIATE" | "ADVANCED")
    : null;
}

function phraseContains(haystack: string, needle: string): boolean {
  if (needle.length < 3) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function stableValue(value: NormalizedProfileFeatures) {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, Array.isArray(entry) ? [...entry].sort((a, b) => a.localeCompare(b)) : entry]),
  );
}
