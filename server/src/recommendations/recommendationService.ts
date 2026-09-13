import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ensureV3ProjectCatalog } from "../catalog/v3ProjectCatalog.js";
import { prisma } from "../db/prisma.js";
import { buildProfileFeatures, PROFILE_FEATURE_VERSION } from "../personalization/profileFeatureService.js";
import { rankCatalogProjectsWithFeatures, RANKER_VERSION, type RuleRankingResponse } from "../ranking/rankingService.js";
import { env } from "../config/env.js";
import { pilotCatalogProjectWhere } from "../pilotCatalog/eligibility.js";

export const RECOMMENDATION_LIMIT = 12;

export const recommendationProjectSelect = {
  id: true,
  title: true,
  description: true,
  organizationName: true,
  sourceType: true,
  provenanceStatus: true,
  opportunityType: true,
  moderationStatus: true,
  visibility: true,
  schoolName: true,
  externalUrl: true,
  locationType: true,
  applicationInstructions: true,
  deadline: true,
  startsAt: true,
  endsAt: true,
  scrapedAt: true,
  lastSeenAt: true,
  category: true,
  majorTags: true,
  interestTags: true,
  skillTags: true,
  estimatedHours: true,
  difficulty: true,
  deliverable: true,
  submissionRequirements: true,
  checkpointPlan: true,
  checkpointPlanVersion: true,
  targetRoleIds: true,
  competencyIds: true,
  portfolioSignalIds: true,
  requiredToolIds: true,
  accessRequirementIds: true,
  recommendedExperienceLevels: true,
  careerTaxonomyVersion: true,
  careerMappingVersion: true,
  skills: true,
  verificationType: true,
  verificationMethod: true,
  resumeValue: true,
  proofQuality: true,
  rankScore: true,
  status: true,
  isStarter: true,
  createdAt: true,
  updatedAt: true,
} as const;

export type RecommendationProject = Prisma.ProjectGetPayload<{ select: typeof recommendationProjectSelect }>;

export type RecommendationResult = {
  ranking: RuleRankingResponse;
  projects: RecommendationProject[];
  savedProjectIds: Set<string>;
  applicationStatusByProjectId: Map<string, string>;
  plan: string;
  profileFeatureVersion: typeof PROFILE_FEATURE_VERSION;
  catalogVersion: string;
  generatedAt: string;
  cacheStatus: "hit" | "generated";
  weeklyHours: number;
};

export async function getRecommendationsForUser(userId: string): Promise<RecommendationResult> {
  await ensureV3ProjectCatalog();
  const [user, catalog, savedProjects, applications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        studentProfile: {
          select: {
            major: true,
            careerInterests: true,
            targetRoles: true,
            targetCompanies: true,
            nicheInterests: true,
            experienceLevel: true,
            currentSkills: true,
            skillsToBuild: true,
            projectPreferences: true,
            resumeStrength: true,
            roadmapDefaults: true,
          },
        },
      },
    }),
    prisma.project.findMany({
      where: {
        status: "PUBLISHED",
        moderationStatus: "APPROVED",
        isStarter: false,
        checkpointPlanVersion: { gt: 0 },
        ...pilotCatalogProjectWhere(env.pilotCatalogMode),
      },
      orderBy: { id: "asc" },
      select: recommendationProjectSelect,
    }),
    prisma.savedProject.findMany({ where: { userId }, select: { projectId: true } }),
    prisma.projectApplication.findMany({
      where: { userId, status: { not: "WITHDRAWN" } },
      select: { projectId: true, status: true, updatedAt: true },
      orderBy: { projectId: "asc" },
    }),
  ]);
  if (!user) throw new Error("Authenticated user was not found.");

  const completedIds = new Set(applications.filter((entry) => entry.status === "VERIFIED").map((entry) => entry.projectId));
  const eligibleCatalog = catalog.filter((project) => !completedIds.has(project.id));
  const profile = buildProfileFeatures(user.studentProfile);
  const catalogVersion = stableHash(
    eligibleCatalog.map((project) => ({
      id: project.id,
      updatedAt: project.updatedAt.toISOString(),
      checkpointPlanVersion: project.checkpointPlanVersion,
      careerMappingVersion: project.careerMappingVersion,
      careerTaxonomyVersion: project.careerTaxonomyVersion,
    })),
  );
  const eligibilityHash = stableHash({
    profileHash: profile.profileHash,
    plan: user.plan,
    applications: applications.map((entry) => ({
      projectId: entry.projectId,
      status: entry.status,
      updatedAt: entry.updatedAt.toISOString(),
    })),
  });

  const cached = await prisma.recommendationCache.findUnique({ where: { userId } });
  const cachedRanking = cached && cacheMatches(cached, eligibilityHash, catalogVersion) ? parseRanking(cached.result) : null;

  let ranking: RuleRankingResponse;
  let generatedAt: string;
  let cacheStatus: "hit" | "generated";
  if (cachedRanking) {
    ranking = cachedRanking;
    generatedAt = cached!.generatedAt.toISOString();
    cacheStatus = "hit";
  } else {
    ranking = rankCatalogProjectsWithFeatures(profile.features, eligibleCatalog);
    ranking.rankedProjects = ranking.rankedProjects.slice(0, RECOMMENDATION_LIMIT);
    ranking.catalogVersion = catalogVersion;
    const generated = new Date();
    await prisma.recommendationCache.upsert({
      where: { userId },
      create: {
        userId,
        result: ranking as unknown as Prisma.InputJsonValue,
        profileHash: eligibilityHash,
        profileFeatureVersion: PROFILE_FEATURE_VERSION,
        rankerVersion: RANKER_VERSION,
        catalogVersion,
        generatedAt: generated,
      },
      update: {
        result: ranking as unknown as Prisma.InputJsonValue,
        profileHash: eligibilityHash,
        profileFeatureVersion: PROFILE_FEATURE_VERSION,
        rankerVersion: RANKER_VERSION,
        catalogVersion,
        generatedAt: generated,
      },
    });
    generatedAt = generated.toISOString();
    cacheStatus = "generated";
  }

  return {
    ranking,
    projects: eligibleCatalog,
    savedProjectIds: new Set(savedProjects.map((entry) => entry.projectId)),
    applicationStatusByProjectId: new Map(applications.map((entry) => [entry.projectId, entry.status])),
    plan: user.plan,
    profileFeatureVersion: PROFILE_FEATURE_VERSION,
    catalogVersion,
    generatedAt,
    cacheStatus,
    weeklyHours: profile.features.weeklyHours,
  };
}

function cacheMatches(
  cached: { profileHash: string; profileFeatureVersion: string; rankerVersion: string; catalogVersion: string },
  profileHash: string,
  catalogVersion: string,
) {
  return (
    cached.profileHash === profileHash &&
    cached.profileFeatureVersion === PROFILE_FEATURE_VERSION &&
    cached.rankerVersion === RANKER_VERSION &&
    cached.catalogVersion === catalogVersion
  );
}

function parseRanking(value: unknown): RuleRankingResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<RuleRankingResponse>;
  if (candidate.rankerVersion !== RANKER_VERSION || !Array.isArray(candidate.rankedProjects)) return null;
  return candidate as RuleRankingResponse;
}

function stableHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
