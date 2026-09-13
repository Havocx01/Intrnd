import {
  CAREER_TAXONOMY_VERSION,
  accessRequirements,
  careerCompetencies,
  careerDomains,
  careerRoles,
  experienceLevels,
  portfolioSignals,
  requiredTools,
  roleDomainIds,
  taxonomyLabel,
  type ProjectCareerMapping,
} from "./taxonomy.js";

export type CareerMappingIssue = { severity: "ERROR" | "WARNING"; code: string; message: string };
type CareerMappingLike = Omit<Partial<ProjectCareerMapping>, "careerTaxonomyVersion"> & { careerTaxonomyVersion?: string | null };

const known = {
  targetRoleIds: new Set(careerRoles.map((entry) => entry.id)),
  competencyIds: new Set(careerCompetencies.map((entry) => entry.id)),
  portfolioSignalIds: new Set(portfolioSignals.map((entry) => entry.id)),
  requiredToolIds: new Set(requiredTools.map((entry) => entry.id)),
  accessRequirementIds: new Set(accessRequirements.map((entry) => entry.id)),
  recommendedExperienceLevels: new Set(experienceLevels.map((entry) => entry.id)),
};

const limits = {
  targetRoleIds: [1, 8],
  competencyIds: [2, 12],
  portfolioSignalIds: [1, 6],
  requiredToolIds: [1, 12],
  accessRequirementIds: [1, 10],
  recommendedExperienceLevels: [1, 3],
} as const;

export function normalizeCareerMapping(input: unknown): { mapping: ProjectCareerMapping | null; error?: string } {
  const value = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const mapping: ProjectCareerMapping = {
    targetRoleIds: strings(value.targetRoleIds),
    competencyIds: strings(value.competencyIds),
    portfolioSignalIds: strings(value.portfolioSignalIds),
    requiredToolIds: strings(value.requiredToolIds),
    accessRequirementIds: strings(value.accessRequirementIds),
    recommendedExperienceLevels: strings(value.recommendedExperienceLevels).map((entry) => entry.toUpperCase()),
    careerTaxonomyVersion: CAREER_TAXONOMY_VERSION,
  };
  const issues = validateCareerMapping(mapping, typeof value.difficulty === "string" ? value.difficulty : null);
  const error = issues.find((issue) => issue.severity === "ERROR");
  return error ? { mapping: null, error: error.message } : { mapping };
}

export function validateCareerMapping(input: CareerMappingLike, difficulty?: string | null): CareerMappingIssue[] {
  const issues: CareerMappingIssue[] = [];
  if (input.careerTaxonomyVersion !== CAREER_TAXONOMY_VERSION) {
    issues.push({
      severity: "ERROR",
      code: "CAREER_TAXONOMY_VERSION_INVALID",
      message: `Career mappings must use ${CAREER_TAXONOMY_VERSION}.`,
    });
  }
  for (const [key, [minimum, maximum]] of Object.entries(limits) as Array<[keyof typeof limits, readonly [number, number]]>) {
    const values = Array.isArray(input[key]) ? input[key]! : [];
    if (values.length < minimum || values.length > maximum) {
      issues.push({
        severity: "ERROR",
        code: `${key.replace(/Ids$/, "").toUpperCase()}_COUNT_INVALID`,
        message: `${friendly(key)} requires ${minimum}-${maximum} selections.`,
      });
    }
    if (new Set(values).size !== values.length) {
      issues.push({
        severity: "ERROR",
        code: `${key.replace(/Ids$/, "").toUpperCase()}_DUPLICATE`,
        message: `${friendly(key)} cannot contain duplicates.`,
      });
    }
    const unknown = values.filter((entry) => !known[key].has(entry));
    if (unknown.length) {
      issues.push({
        severity: "ERROR",
        code: `${key.replace(/Ids$/, "").toUpperCase()}_UNKNOWN`,
        message: `${friendly(key)} contains unknown IDs: ${unknown.join(", ")}.`,
      });
    }
  }
  if (difficulty && !input.recommendedExperienceLevels?.includes(difficulty.toUpperCase())) {
    issues.push({
      severity: "ERROR",
      code: "PROJECT_DIFFICULTY_NOT_RECOMMENDED",
      message: "Recommended experience levels must include the project's current difficulty.",
    });
  }
  const roleDomains = roleDomainIds(input.targetRoleIds ?? []);
  if (roleDomains.length > 2) {
    issues.push({
      severity: "WARNING",
      code: "CAREER_MAPPING_TOO_BROAD",
      message: "Target roles span more than two career domains; confirm the project is not being overgeneralized.",
    });
  }
  if ((input.competencyIds?.length ?? 0) > 8) {
    issues.push({
      severity: "WARNING",
      code: "COMPETENCY_SCOPE_BROAD",
      message: "More than eight competencies are mapped; confirm each is visibly demonstrated by the final evidence.",
    });
  }
  return issues;
}

export function resolvedCareerMapping(mapping: CareerMappingLike) {
  return {
    taxonomyVersion: mapping.careerTaxonomyVersion ?? null,
    targetRoles: resolve("roles", mapping.targetRoleIds),
    competencies: resolve("competencies", mapping.competencyIds),
    portfolioSignals: resolve("portfolioSignals", mapping.portfolioSignalIds),
    requiredTools: resolve("requiredTools", mapping.requiredToolIds),
    accessRequirements: resolve("accessRequirements", mapping.accessRequirementIds),
    recommendedExperienceLevels: resolve("experienceLevels", mapping.recommendedExperienceLevels),
    domainIds: roleDomainIds(mapping.targetRoleIds ?? []),
    domains: roleDomainIds(mapping.targetRoleIds ?? []).map((id) => ({
      id,
      label: careerDomains.find((entry) => entry.id === id)?.label ?? id,
    })),
  };
}

function resolve(kind: Parameters<typeof taxonomyLabel>[0], values: readonly string[] | undefined) {
  return (values ?? []).map((id) => ({ id, label: taxonomyLabel(kind, id) }));
}

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .map(String)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
}

function friendly(value: string) {
  return value
    .replace(/Ids$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}
