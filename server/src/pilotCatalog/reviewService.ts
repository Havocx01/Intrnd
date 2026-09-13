import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { careerReviewerExpertise, roleDomainIds } from "../career/taxonomy.js";
import { PILOT_CATALOG_VERSION } from "./manifest.js";
import { normalizeCatalogReview, pilotCatalogProjectFingerprint, validatePilotCatalogProject } from "./validation.js";

export class CatalogReviewError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 409,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export async function saveAssignedCatalogReview(input: {
  projectId: string;
  reviewerId: string;
  body: unknown;
  expectedProjectFingerprint?: string;
}) {
  const normalized = normalizeCatalogReview(input.body);
  if (!normalized.review) throw new CatalogReviewError("PILOT_REVIEW_INVALID", normalized.error ?? "Invalid review.", 400);
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    include: { organization: { select: { userId: true } }, catalogReviewAssignments: { where: { catalogVersion: PILOT_CATALOG_VERSION } } },
  });
  if (!project || project.pilotCatalogVersion !== PILOT_CATALOG_VERSION || project.pilotCatalogStatus === "NOT_CANDIDATE") {
    throw new CatalogReviewError("PILOT_CANDIDATE_NOT_FOUND", "Pilot catalog candidate not found.", 404);
  }
  const assignment = project.catalogReviewAssignments.find((entry) => entry.reviewerId === input.reviewerId);
  if (!assignment || !["DOMAIN", "CAREER"].includes(assignment.reviewType)) {
    throw new CatalogReviewError("CATALOG_REVIEW_NOT_ASSIGNED", "You are not assigned to this project's current review.", 403);
  }
  const profile = await prisma.catalogReviewerProfile.findUnique({ where: { userId: input.reviewerId } });
  if (!profile?.active || !profile.reviewerTypes.includes(assignment.reviewType)) {
    throw new CatalogReviewError("CATALOG_REVIEWER_NOT_QUALIFIED", "Your reviewer profile is not active for this review type.", 403);
  }
  if (project.createdById === input.reviewerId || project.organization?.userId === input.reviewerId) {
    throw new CatalogReviewError(
      "CATALOG_REVIEWER_CONFLICT",
      "A project creator or linked organization owner cannot review this project.",
      403,
    );
  }
  const expertise = assignment.reviewType === "DOMAIN" ? profile.domainExpertiseIds : profile.careerExpertiseIds;
  if (assignment.reviewType === "DOMAIN" && !roleDomainIds(project.targetRoleIds).some((domainId) => expertise.includes(domainId))) {
    throw new CatalogReviewError("DOMAIN_EXPERTISE_MISMATCH", "Your domain expertise does not overlap this project's target roles.", 403);
  }
  const knownCareerExpertise = new Set(careerReviewerExpertise.map((entry) => entry.id));
  if (assignment.reviewType === "CAREER" && !expertise.some((entry) => knownCareerExpertise.has(entry))) {
    throw new CatalogReviewError("CAREER_EXPERTISE_REQUIRED", "A recognized career-review expertise is required.", 403);
  }
  const issues = validatePilotCatalogProject(project);
  if (normalized.review.decision === "APPROVE" && issues.some((issue) => issue.severity === "ERROR")) {
    throw new CatalogReviewError("PILOT_PROJECT_VALIDATION_FAILED", "Resolve the project validation errors before approval.", 409, {
      issues,
    });
  }
  const fingerprint = pilotCatalogProjectFingerprint(project);
  if (input.expectedProjectFingerprint && input.expectedProjectFingerprint !== fingerprint) {
    throw new CatalogReviewError(
      "PILOT_REVIEW_FINGERPRINT_MISMATCH",
      "This review was produced from a stale project dossier. Generate a new dossier and review the current fingerprint.",
      409,
      { expectedProjectFingerprint: input.expectedProjectFingerprint, currentProjectFingerprint: fingerprint },
    );
  }
  const actor = input.reviewerId;
  const reviewerKind = profile.reviewerKind;
  const modelLabel = profile.modelLabel ?? null;
  const { noConflictConfirmed: _confirmed, scoreJustifications, ...reviewInput } = normalized.review;
  return prisma.$transaction(
    async (transaction) => {
      const review = await transaction.projectCatalogReview.upsert({
        where: { projectId_reviewerId_catalogVersion: { projectId: project.id, reviewerId: actor, catalogVersion: PILOT_CATALOG_VERSION } },
        create: {
          projectId: project.id,
          reviewerId: actor,
          catalogVersion: PILOT_CATALOG_VERSION,
          projectFingerprint: fingerprint,
          ...reviewInput,
          reviewType: assignment.reviewType,
          conflictConfirmedAt: new Date(),
          reviewerExpertiseSnapshot: { reviewType: assignment.reviewType, expertiseIds: expertise },
          scoreJustifications,
          reviewerKind,
          modelLabel,
        },
        update: {
          ...reviewInput,
          projectFingerprint: fingerprint,
          reviewType: assignment.reviewType,
          conflictConfirmedAt: new Date(),
          reviewerExpertiseSnapshot: { reviewType: assignment.reviewType, expertiseIds: expertise },
          scoreJustifications,
          reviewerKind,
          modelLabel,
        },
        include: { reviewer: { select: { id: true, name: true, email: true } } },
      });
      if (reviewInput.decision === "REJECT") {
        await transaction.project.update({ where: { id: project.id }, data: { pilotCatalogStatus: "HOLD" } });
      } else if (project.pilotCatalogStatus === "HOLD") {
        await transaction.project.update({ where: { id: project.id }, data: { pilotCatalogStatus: "CANDIDATE" } });
      }
      await transaction.auditLog.create({
        data: {
          actor,
          action: "PILOT_CATALOG_REVIEWED",
          target: `project:${project.id}`,
          metadata: JSON.stringify({
            catalogVersion: PILOT_CATALOG_VERSION,
            decision: reviewInput.decision,
            reviewType: assignment.reviewType,
            confidence: reviewInput.confidence,
            reviewerKind,
            modelLabel,
          }),
        },
      });
      return { review, issues };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
