import { prisma } from "../db/prisma.js";
import { resolvedCareerMapping } from "../career/mapping.js";
import { normalizeSubmissionRequirements } from "../submissions/requirements.js";
import { PILOT_CATALOG_VERSION, humanReviewRiskCodes, pilotCatalogCandidate } from "./manifest.js";
import { pilotCatalogProjectFingerprint, validatePilotCatalogProject } from "./validation.js";

export async function buildPilotReviewDossier(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      catalogReviewAssignments: {
        where: { catalogVersion: PILOT_CATALOG_VERSION },
        include: { reviewer: { select: { email: true, catalogReviewerProfile: { select: { reviewerKind: true, modelLabel: true } } } } },
      },
    },
  });
  if (!project || project.pilotCatalogStatus === "NOT_CANDIDATE") {
    throw new Error(`Pilot candidate ${projectId} not found.`);
  }

  const candidate = pilotCatalogCandidate(projectId);
  const issues = validatePilotCatalogProject(project);
  const requirements = normalizeSubmissionRequirements(project.submissionRequirements, project.deliverable);
  const riskCodes = candidate?.riskCodes ?? [];
  const roadmap = (project.checkpointPlan as { checkpoints?: Array<Record<string, unknown>> } | null)?.checkpoints ?? [];

  return {
    catalogVersion: PILOT_CATALOG_VERSION,
    projectFingerprint: pilotCatalogProjectFingerprint(project),
    project: {
      id: project.id,
      title: project.title,
      description: project.description,
      category: project.category,
      difficulty: project.difficulty,
      estimatedHours: project.estimatedHours,
      deliverable: project.deliverable,
      skills: project.skills,
      skillTags: project.skillTags,
      verificationMethod: project.verificationMethod,
      provenanceStatus: project.provenanceStatus,
      sourceType: project.sourceType,
      pilotCatalogStatus: project.pilotCatalogStatus,
      manifestReason: candidate?.reason ?? null,
      manifestRiskCodes: riskCodes,
    },
    reviewPolicy: {
      humanApprovalRequired: humanReviewRiskCodes(riskCodes).length > 0,
      requiredHumanReviewTypes: humanReviewRiskCodes(riskCodes).length > 0 ? ["DOMAIN", "CAREER"] : [],
      finalHumanReviewRequired: true,
    },
    submissionRequirements: requirements.items.map((item) => ({
      key: item.key,
      kind: item.kind,
      title: item.title,
      required: item.required,
      minItems: item.minItems,
    })),
    careerMapping: resolvedCareerMapping(project),
    roadmapCheckpoints: roadmap.map((checkpoint) => ({
      id: checkpoint.id,
      title: checkpoint.title,
      objective: checkpoint.objective,
      requiredOutput: checkpoint.requiredOutput,
      completionMode: checkpoint.completionMode,
      actionsBySupport: checkpoint.actionsBySupport,
      definitionOfDone: checkpoint.definitionOfDone,
      estimatedMinutesBySupport: checkpoint.estimatedMinutesBySupport,
      resourcesBySupport: checkpoint.resourcesBySupport,
      requiredSkills: checkpoint.requiredSkills,
      submissionRequirementKeys: checkpoint.submissionRequirementKeys,
      prerequisiteCheckpointIds: checkpoint.prerequisiteCheckpointIds,
    })),
    structuralValidation: {
      errors: issues.filter((issue) => issue.severity === "ERROR"),
      warnings: issues.filter((issue) => issue.severity === "WARNING"),
    },
    currentAssignments: project.catalogReviewAssignments.map((assignment) => ({
      reviewType: assignment.reviewType,
      reviewerId: assignment.reviewerId,
      reviewerEmail: assignment.reviewer.email,
      reviewerKind: assignment.reviewer.catalogReviewerProfile?.reviewerKind ?? null,
      modelLabel: assignment.reviewer.catalogReviewerProfile?.modelLabel ?? null,
    })),
  };
}
