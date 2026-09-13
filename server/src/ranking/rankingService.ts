import type { CompactRankProjectsRequest, RankProjectsRequest } from "./types.js";
import { buildProfileFeatures, type NormalizedProfileFeatures } from "../personalization/profileFeatureService.js";
import { buildPersonalizedReason, personalizationReasonCodes, scoreProjectPersonalization } from "./personalizationScorer.js";
import { CAREER_TAXONOMY_VERSION } from "../career/taxonomy.js";

export const RANKER_VERSION = "personalized-rules-v4" as const;

export type MatchBand = "STRONG" | "GOOD" | "EXPLORATORY";

export type RuleRankedProject = {
  rank: number;
  projectId: string;
  projectTitle: string;
  matchBand: MatchBand;
  reasonCodes: string[];
  reason: string;
  matchDetails: { matchedOn: string[]; builds: string[]; outcome: string; whyNow: string };
};

export type RuleRankingResponse = {
  rankedProjects: RuleRankedProject[];
  rankerVersion: typeof RANKER_VERSION;
  catalogVersion?: string;
  meta?: Record<string, unknown>;
};

export type SavedProfileForRanking = {
  school?: string | null;
  major?: string | null;
  gradYear?: number | null;
  careerInterests?: string | null;
  skillsToBuild?: string | null;
  projectPreferences?: string | null;
  targetRoles?: string | null;
  targetCompanies?: string | null;
  nicheInterests?: string | null;
  experienceLevel?: string | null;
  currentSkills?: string | null;
  resumeStrength?: number | null;
} | null;

export type CatalogProjectForRanking = {
  id: string;
  title: string;
  description: string;
  sourceType: string;
  category: string | null;
  majorTags?: string | null;
  interestTags?: string | null;
  skillTags?: string | null;
  estimatedHours: string | null;
  difficulty: string | null;
  deliverable: string | null;
  skills: string | null;
  verificationType: string | null;
  verificationMethod: string | null;
  resumeValue?: number | null;
  proofQuality?: number | null;
  rankScore?: number | null;
  checkpointPlan?: unknown;
  targetRoleIds?: string[];
  competencyIds?: string[];
  portfolioSignalIds?: string[];
  recommendedExperienceLevels?: string[];
  careerTaxonomyVersion?: string | null;
  careerMappingVersion?: number;
};

// Keep ranking logic here so routes use the same scoring rules.
export function rankCatalogProjectsWithRules(profile: SavedProfileForRanking, projects: CatalogProjectForRanking[]): RuleRankingResponse {
  return rankCatalogProjectsWithFeatures(buildProfileFeatures(profile).features, projects);
}

export function rankCatalogProjectsWithFeatures(
  features: NormalizedProfileFeatures,
  projects: CatalogProjectForRanking[],
): RuleRankingResponse {
  return rankProjectsWithRules({
    student_profile: {
      major: features.major,
      academic_major: features.major,
      target_field: features.careerInterests.join(", ") || features.major,
      field_of_interest: features.careerInterests.join(", ") || null,
      careerInterests: features.careerInterests.join(", ") || null,
      career_interests: features.careerInterests,
      targetRoles: features.targetRoles.join(", ") || null,
      target_roles: features.targetRoles,
      target_companies: features.targetCompanies,
      niche_interests: features.nicheInterests,
      desired_outcome: features.projectPreferences.join(", ") || null,
      experience_level: features.experienceLevel,
      currentSkills: features.currentSkills,
      current_skills: features.currentSkills,
      skillsToBuild: features.desiredSkills,
      skills_to_build: features.desiredSkills,
      project_preferences: features.projectPreferences.join(", ") || null,
      resume_strength: features.resumeStrength,
      available_time_per_week: `${features.weeklyHours} hours`,
    },
    available_projects: projects.map((project) => ({
      project_id: project.id,
      project_title: project.title,
      target_field: project.category ?? project.interestTags ?? null,
      difficulty: project.difficulty,
      estimated_time: canonicalEstimate(project.checkpointPlan) ?? project.estimatedHours,
      skills_learned: splitTags(project.skills ?? project.skillTags),
      deliverables: splitTags(project.deliverable),
      resume_value_1_10: project.resumeValue ?? scoreFromRank(project.rankScore) ?? 5,
      portfolio_value_1_10: project.proofQuality ?? scoreFromRank(project.rankScore) ?? 5,
      verification_type: project.verificationType ?? project.verificationMethod,
      source_type: project.sourceType,
      career_signal: [project.description, project.majorTags, project.interestTags, project.skillTags].filter(Boolean).join(" "),
      role_ids: project.targetRoleIds,
      competency_ids: project.competencyIds,
      portfolio_signal_ids: project.portfolioSignalIds,
      recommended_experience_levels: project.recommendedExperienceLevels,
      career_taxonomy_version: project.careerTaxonomyVersion ?? CAREER_TAXONOMY_VERSION,
    })),
  });
}

export function rankProjectsWithRules(request: RankProjectsRequest): RuleRankingResponse {
  const input: CompactRankProjectsRequest = {
    ...request,
    field_intelligence: request.field_intelligence ?? {},
    resume_success_patterns: request.resume_success_patterns ?? {},
  };
  const ranked = input.available_projects
    .map((project) => ({ project, personalization: scoreProjectPersonalization(project, input) }))
    .sort((a, b) => b.personalization.score - a.personalization.score || a.project.project_id.localeCompare(b.project.project_id));
  return {
    rankerVersion: RANKER_VERSION,
    rankedProjects: ranked.map(({ project, personalization }, index) => {
      return {
        rank: index + 1,
        projectId: project.project_id,
        projectTitle: project.project_title,
        matchBand: matchBand(personalization.score),
        reasonCodes: personalizationReasonCodes(personalization.details),
        reason: buildPersonalizedReason(project, input, personalization.details),
        matchDetails: {
          matchedOn: personalization.details.matchedOn,
          builds: personalization.details.builds,
          outcome: personalization.details.outcome,
          whyNow: personalization.details.whyNow,
        },
      };
    }),
  };
}

function canonicalEstimate(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const checkpoints = (value as { checkpoints?: unknown }).checkpoints;
  if (!Array.isArray(checkpoints)) return null;
  const minutes = checkpoints.reduce((total, checkpoint) => {
    if (!checkpoint || typeof checkpoint !== "object" || Array.isArray(checkpoint)) return total;
    const estimates = (checkpoint as { estimatedMinutesBySupport?: unknown }).estimatedMinutesBySupport;
    if (!estimates || typeof estimates !== "object" || Array.isArray(estimates)) return total;
    const standard = Number((estimates as Record<string, unknown>).STANDARD);
    return total + (Number.isFinite(standard) && standard > 0 ? standard : 0);
  }, 0);
  return minutes > 0 ? `${Math.max(1, Math.ceil(minutes / 300))} weeks` : null;
}

function matchBand(score: number): MatchBand {
  if (score >= 72) return "STRONG";
  if (score >= 50) return "GOOD";
  return "EXPLORATORY";
}

function splitTags(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/[,;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function scoreFromRank(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(1, Math.min(10, value));
}
