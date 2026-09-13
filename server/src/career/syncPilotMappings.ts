import { prisma } from "../db/prisma.js";
import { PILOT_CATALOG_V1 } from "../pilotCatalog/manifest.js";
import { validateCareerMapping } from "./mapping.js";
import { PILOT_CAREER_MAPPINGS_V1 } from "./pilotMappings.v1.js";

export async function syncPilotCareerMappings(options: { force?: boolean } = {}) {
  const candidateIds = PILOT_CATALOG_V1.map((entry) => entry.projectId);
  const mappingIds = Object.keys(PILOT_CAREER_MAPPINGS_V1);
  const missingMappings = candidateIds.filter((id) => !PILOT_CAREER_MAPPINGS_V1[id]);
  const unknownMappings = mappingIds.filter((id) => !candidateIds.includes(id));
  if (missingMappings.length || unknownMappings.length) {
    return {
      candidates: candidateIds.length,
      mapped: mappingIds.length,
      updated: 0,
      missingMappings,
      unknownMappings,
      invalidMappings: [] as unknown[],
    };
  }

  const projects = await prisma.project.findMany({
    where: { id: { in: candidateIds } },
    select: {
      id: true,
      difficulty: true,
      careerMappingVersion: true,
      targetRoleIds: true,
      competencyIds: true,
      portfolioSignalIds: true,
      requiredToolIds: true,
      accessRequirementIds: true,
      recommendedExperienceLevels: true,
      careerTaxonomyVersion: true,
    },
  });
  const invalidMappings = projects.flatMap((project) => {
    const mapping = PILOT_CAREER_MAPPINGS_V1[project.id];
    const issues = validateCareerMapping(mapping, project.difficulty).filter((issue) => issue.severity === "ERROR");
    return issues.length ? [{ projectId: project.id, issues }] : [];
  });
  if (invalidMappings.length) {
    return { candidates: candidateIds.length, mapped: mappingIds.length, updated: 0, missingMappings, unknownMappings, invalidMappings };
  }

  let updated = 0;
  for (const project of projects) {
    if (!options.force && project.careerMappingVersion > 0) continue;
    const mapping = PILOT_CAREER_MAPPINGS_V1[project.id];
    const mappingUnchanged =
      sameValues(project.targetRoleIds, mapping.targetRoleIds) &&
      sameValues(project.competencyIds, mapping.competencyIds) &&
      sameValues(project.portfolioSignalIds, mapping.portfolioSignalIds) &&
      sameValues(project.requiredToolIds, mapping.requiredToolIds) &&
      sameValues(project.accessRequirementIds, mapping.accessRequirementIds) &&
      sameValues(project.recommendedExperienceLevels, mapping.recommendedExperienceLevels) &&
      project.careerTaxonomyVersion === mapping.careerTaxonomyVersion;
    if (mappingUnchanged) continue;
    await prisma.project.update({
      where: { id: project.id },
      data: { ...mapping, careerMappingVersion: Math.max(1, project.careerMappingVersion + 1) },
    });
    updated += 1;
  }
  return {
    candidates: candidateIds.length,
    mapped: projects.length,
    updated,
    missingProjects: candidateIds.filter((id) => !projects.some((project) => project.id === id)),
    missingMappings,
    unknownMappings,
    invalidMappings,
  };
}

function sameValues(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/syncPilotMappings.ts")) {
  try {
    const result = await syncPilotCareerMappings({ force: process.argv.includes("--force") });
    console.log(JSON.stringify(result, null, 2));
    if (result.missingMappings.length || result.unknownMappings.length || result.invalidMappings.length) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
