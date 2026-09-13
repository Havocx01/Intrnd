import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { normalizeSubmissionRequirements } from "../submissions/requirements.js";
import { estimateCatalogMinutes } from "./catalog.js";
import { ROADMAP_CATALOG_V1 } from "./catalog.v1.generated.js";
import { validateCanonicalRoadmap } from "./validation.js";

export async function syncRoadmapCatalog(options: { force?: boolean; quarantineInvalid?: boolean } = {}) {
  const projects = await prisma.project.findMany({
    where: { status: "PUBLISHED", moderationStatus: "APPROVED" },
    select: {
      id: true,
      title: true,
      category: true,
      difficulty: true,
      estimatedHours: true,
      deliverable: true,
      skills: true,
      skillTags: true,
      submissionRequirements: true,
      checkpointPlan: true,
      checkpointPlanVersion: true,
    },
    orderBy: { id: "asc" },
  });
  let updated = 0;
  const failures: Array<{ projectId: string; issues: ReturnType<typeof validateCanonicalRoadmap> }> = [];
  for (const project of projects) {
    const requirements = normalizeSubmissionRequirements(project.submissionRequirements, project.deliverable);
    const plan = ROADMAP_CATALOG_V1[project.id];
    if (!plan) {
      failures.push({
        projectId: project.id,
        issues: [{ code: "ROADMAP_CATALOG_ENTRY_MISSING", message: `No v1 catalog entry exists for ${project.id}.` }],
      });
      continue;
    }
    const issues = validateCanonicalRoadmap(plan, {
      projectId: project.id,
      requiredSubmissionKeys: requirements.items.filter((item) => item.required).map((item) => item.key),
      catalogEstimatedMinutes: estimateCatalogMinutes(project.estimatedHours),
    });
    if (issues.length) {
      failures.push({ projectId: project.id, issues });
      continue;
    }
    if (!options.force && project.checkpointPlanVersion >= 1 && project.checkpointPlan) {
      const storedIssues = validateCanonicalRoadmap(project.checkpointPlan, {
        projectId: project.id,
        requiredSubmissionKeys: requirements.items.filter((item) => item.required).map((item) => item.key),
        catalogEstimatedMinutes: estimateCatalogMinutes(project.estimatedHours),
      });
      if (!storedIssues.length) continue;
      // Repair v1 from the checked-in catalog; never overwrite admin-published v2 or later.
      if (project.checkpointPlanVersion > plan.version) {
        failures.push({ projectId: project.id, issues: storedIssues });
        continue;
      }
    }
    await prisma.$transaction(async (transaction) => {
      await transaction.project.update({
        where: { id: project.id },
        data: { checkpointPlan: plan as unknown as Prisma.InputJsonValue, checkpointPlanVersion: plan.version },
      });
      await transaction.projectRoadmapVersion.upsert({
        where: { projectId_version: { projectId: project.id, version: plan.version } },
        create: {
          projectId: project.id,
          version: plan.version,
          plan: plan as unknown as Prisma.InputJsonValue,
          publishedBy: "catalog-sync",
        },
        update: { plan: plan as unknown as Prisma.InputJsonValue },
      });
    });
    updated += 1;
  }
  if (options.quarantineInvalid && failures.length) {
    const projectIds = failures.map((failure) => failure.projectId);
    await prisma.$transaction(async (transaction) => {
      await transaction.project.updateMany({ where: { id: { in: projectIds }, status: "PUBLISHED" }, data: { status: "DRAFT" } });
      await transaction.auditLog.createMany({
        data: failures.map((failure) => ({
          actor: "system",
          action: "PROJECT_ROADMAP_QUARANTINED",
          target: `project:${failure.projectId}`,
          metadata: JSON.stringify({ issues: failure.issues }),
        })),
      });
    });
  }
  return { total: projects.length, updated, valid: projects.length - failures.length, failures };
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/syncCatalog.ts")) {
  try {
    const result = await syncRoadmapCatalog({ force: process.argv.includes("--force") });
    console.log(JSON.stringify(result, null, 2));
    if (result.failures.length) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
