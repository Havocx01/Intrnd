import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireCatalogReviewer } from "../middleware/requireCatalogReviewer.js";
import { resolvedCareerMapping } from "../career/mapping.js";
import { PILOT_CATALOG_VERSION, pilotCatalogCandidate } from "../pilotCatalog/manifest.js";
import { CatalogReviewError, saveAssignedCatalogReview } from "../pilotCatalog/reviewService.js";
import {
  isCurrentQualifiedAssignment,
  pilotCatalogProjectFingerprint,
  pilotPublishReadiness,
  validatePilotCatalogProject,
} from "../pilotCatalog/validation.js";

const router = Router();

router.get("/pilot-catalog", requireCatalogReviewer, async (request, response) => {
  const assignments = await prisma.projectCatalogReviewAssignment.findMany({
    where: { reviewerId: request.user!.id, catalogVersion: PILOT_CATALOG_VERSION },
    include: {
      project: {
        include: {
          catalogReviews: {
            where: { catalogVersion: PILOT_CATALOG_VERSION },
            include: { reviewer: { select: { id: true, name: true, email: true } } },
          },
          catalogReviewAssignments: {
            where: { catalogVersion: PILOT_CATALOG_VERSION },
            include: { reviewer: { select: { id: true, name: true, email: true, role: true, catalogReviewerProfile: true } } },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  response.json({
    catalogVersion: PILOT_CATALOG_VERSION,
    currentReviewerId: request.user!.id,
    projects: assignments.map((assignment) => {
      const project = assignment.project;
      const issues = validatePilotCatalogProject(project);
      const fingerprint = pilotCatalogProjectFingerprint(project);
      return {
        id: project.id,
        title: project.title,
        description: project.description,
        category: project.category,
        difficulty: project.difficulty,
        estimatedHours: project.estimatedHours,
        deliverable: project.deliverable,
        skills: project.skills,
        verificationMethod: project.verificationMethod,
        provenanceStatus: project.provenanceStatus,
        sourceType: project.sourceType,
        externalUrl: project.externalUrl,
        pilotCatalogStatus: project.pilotCatalogStatus,
        mapping: resolvedCareerMapping(project),
        careerMappingVersion: project.careerMappingVersion,
        roadmapReview: catalogRoadmapReview(project.checkpointPlan),
        assignment: { id: assignment.id, reviewType: assignment.reviewType },
        issues,
        catalogReviews: project.catalogReviews,
        publishReadiness: pilotPublishReadiness({
          projectIssues: issues,
          projectFingerprint: fingerprint,
          reviews: project.catalogReviews,
          assignments: project.catalogReviewAssignments.map((currentAssignment) => ({
            ...currentAssignment,
            qualified: isCurrentQualifiedAssignment(project.targetRoleIds, currentAssignment),
            reviewerKind: currentAssignment.reviewer.catalogReviewerProfile?.reviewerKind,
          })),
          riskCodes: pilotCatalogCandidate(project.id)?.riskCodes,
        }),
      };
    }),
  });
});

router.put("/pilot-catalog/:projectId/review", requireCatalogReviewer, async (request, response) => {
  try {
    const result = await saveAssignedCatalogReview({
      projectId: firstParam(request.params.projectId),
      reviewerId: request.user!.id,
      body: request.body,
    });
    response.json(result);
  } catch (error) {
    if (error instanceof CatalogReviewError) {
      response.status(error.status).json({ error: error.message, code: error.code, ...error.details });
      return;
    }
    throw error;
  }
});

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function catalogRoadmapReview(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { checkpoints: [] };
  const checkpoints = (value as { checkpoints?: unknown }).checkpoints;
  if (!Array.isArray(checkpoints)) return { checkpoints: [] };
  return {
    checkpoints: checkpoints.flatMap((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const checkpoint = entry as Record<string, unknown>;
      return [
        {
          id: String(checkpoint.id ?? ""),
          title: String(checkpoint.title ?? ""),
          requiredOutput: String(checkpoint.requiredOutput ?? ""),
          completionMode: String(checkpoint.completionMode ?? ""),
        },
      ];
    }),
  };
}

export default router;
