import { Router } from "express";
import { hasFullRecommendationAccess, sanitizeLockedProject } from "../lib/lockedProjects.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getRecommendationsForUser, type RecommendationProject } from "../recommendations/recommendationService.js";
import { normalizeSubmissionRequirements } from "../submissions/requirements.js";
import { buildRoadmapPreview, sourceVerification } from "../projects/projectPresentation.js";

const router = Router();

router.get("/", requireAuth, async (request, response) => {
  try {
    const result = await getRecommendationsForUser(request.user!.id);
    const projectById = new Map(result.projects.map((project) => [project.id, project]));
    const hasFullAccess = hasFullRecommendationAccess(result.plan);
    const freeStarterId = hasFullAccess ? null : (result.ranking.rankedProjects[0]?.projectId ?? null);

    const recommendations = result.ranking.rankedProjects.flatMap((ranked) => {
      const project = projectById.get(ranked.projectId);
      if (!project) return [];
      const applicationStatus = result.applicationStatusByProjectId.get(project.id) ?? null;
      const formatted = formatProject(project, {
        saved: result.savedProjectIds.has(project.id),
        applicationStatus,
        matchBand: ranked.matchBand,
        recommendationReason: ranked.reason,
        matchDetails: ranked.matchDetails,
        weeklyHours: result.weeklyHours,
      });
      const locked = !hasFullAccess && project.id !== freeStarterId && !applicationStatus;
      const entitledProject = locked ? sanitizeLockedProject(formatted) : formatted;
      return [
        {
          rank: ranked.rank,
          projectId: ranked.projectId,
          matchBand: ranked.matchBand,
          reasonCodes: ranked.reasonCodes,
          reason: locked ? "Ranked from your saved profile. Open this recommendation to learn about pilot access." : ranked.reason,
          matchDetails: locked
            ? {
                matchedOn: [],
                builds: [],
                outcome: "Additional project details are available with pilot access.",
                whyNow: "Your first recommendation remains fully available on the free plan.",
              }
            : ranked.matchDetails,
          project: entitledProject,
        },
      ];
    });

    response.json({
      recommendations,
      rankerVersion: result.ranking.rankerVersion,
      profileFeatureVersion: result.profileFeatureVersion,
      catalogVersion: result.catalogVersion,
      generatedAt: result.generatedAt,
      cacheStatus: result.cacheStatus,
    });
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Unable to load recommendations." });
  }
});

function formatProject(
  project: RecommendationProject,
  personalization: {
    saved: boolean;
    applicationStatus: string | null;
    matchBand: string;
    recommendationReason: string;
    matchDetails: unknown;
    weeklyHours: number;
  },
) {
  const source = sourceVerification(project);
  const {
    targetRoleIds: _targetRoleIds,
    competencyIds: _competencyIds,
    portfolioSignalIds: _portfolioSignalIds,
    requiredToolIds: _requiredToolIds,
    accessRequirementIds: _accessRequirementIds,
    recommendedExperienceLevels: _recommendedExperienceLevels,
    careerTaxonomyVersion: _careerTaxonomyVersion,
    careerMappingVersion: _careerMappingVersion,
    ...publicProject
  } = project;
  return {
    ...publicProject,
    checkpointPlan: undefined,
    checkpointPlanVersion: undefined,
    roadmapPreview: buildRoadmapPreview(project.checkpointPlan, personalization.weeklyHours),
    submissionRequirements: normalizeSubmissionRequirements(project.submissionRequirements, project.deliverable),
    skills: splitTags(project.skills),
    majorTags: splitTags(project.majorTags),
    interestTags: splitTags(project.interestTags),
    skillTags: splitTags(project.skillTags),
    sourceLabel: source.label,
    sourceVerification: source,
    recommendationLabel: "",
    matchBand: personalization.matchBand,
    matchDetails: personalization.matchDetails,
    recommendationReason: personalization.recommendationReason,
    saved: personalization.saved,
    applicationStatus: personalization.applicationStatus,
  };
}

function splitTags(value: string | null) {
  return value
    ? value
        .split(/[,;|]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}

export default router;
