import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { PILOT_CATALOG_V1, PILOT_CATALOG_VERSION, pilotCatalogCandidate } from "../pilotCatalog/manifest.js";
import { syncPilotCatalogCandidates } from "../pilotCatalog/sync.js";
import {
  isCurrentQualifiedAssignment,
  pilotCatalogProjectFingerprint,
  pilotPublishReadiness,
  validatePilotCatalogProject,
} from "../pilotCatalog/validation.js";
import { readinessReport } from "../reliability/readiness.js";

try {
  const sync = await syncPilotCatalogCandidates();
  const ids = PILOT_CATALOG_V1.map((candidate) => candidate.projectId);
  const projects = await prisma.project.findMany({
    where: { id: { in: ids } },
    include: {
      catalogReviews: { where: { catalogVersion: PILOT_CATALOG_VERSION } },
      catalogReviewAssignments: {
        where: { catalogVersion: PILOT_CATALOG_VERSION },
        include: { reviewer: { select: { role: true, catalogReviewerProfile: true } } },
      },
    },
  });
  const validation = projects.map((project) => {
    const issues = validatePilotCatalogProject(project);
    return {
      projectId: project.id,
      title: project.title,
      category: project.category,
      difficulty: project.difficulty,
      status: project.pilotCatalogStatus,
      issues,
      publishReadiness: pilotPublishReadiness({
        projectIssues: issues,
        projectFingerprint: pilotCatalogProjectFingerprint(project),
        reviews: project.catalogReviews,
        assignments: project.catalogReviewAssignments.map((assignment) => ({
          ...assignment,
          qualified: isCurrentQualifiedAssignment(project.targetRoleIds, assignment),
          reviewerKind: assignment.reviewer.catalogReviewerProfile?.reviewerKind,
        })),
        riskCodes: pilotCatalogCandidate(project.id)?.riskCodes,
      }),
    };
  });
  const projectIds = new Set(projects.map((project) => project.id));
  const missing = ids.filter((id) => !projectIds.has(id));
  const errors = validation.flatMap((project) =>
    project.issues
      .filter((issue) => issue.severity === "ERROR")
      .map((issue) => ({ projectId: project.projectId, code: issue.code, message: issue.message })),
  );
  const warnings = validation.flatMap((project) =>
    project.issues
      .filter((issue) => issue.severity === "WARNING")
      .map((issue) => ({ projectId: project.projectId, code: issue.code, message: issue.message })),
  );
  const categories = new Set(projects.map((project) => project.category).filter(Boolean));
  const difficulties = projects.reduce<Record<string, number>>((counts, project) => {
    const difficulty = project.difficulty ?? "UNKNOWN";
    counts[difficulty] = (counts[difficulty] ?? 0) + 1;
    return counts;
  }, {});
  const readyViolations = validation.filter((project) => project.status === "PILOT_READY" && !project.publishReadiness.ready);
  const health = await readinessReport();
  const report = {
    catalogVersion: PILOT_CATALOG_VERSION,
    mode: env.pilotCatalogMode,
    manifestCandidates: ids.length,
    syncedCandidates: sync.synced,
    missing,
    categories: categories.size,
    difficulties,
    structurallyBlocked: errors.length,
    warnings: warnings.length,
    pilotReady: validation.filter((project) => project.status === "PILOT_READY").length,
    readyViolations: readyViolations.map((project) => project.projectId),
    health,
    errors,
    warningDetails: warnings,
  };
  console.log(JSON.stringify(report, null, 2));
  const developmentGateFailed =
    missing.length > 0 || ids.length < 40 || categories.size < 15 || errors.length > 0 || readyViolations.length > 0;
  const productionGateFailed = env.pilotCatalogMode === "READY_ONLY" && !health.ready;
  if (developmentGateFailed || productionGateFailed) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
