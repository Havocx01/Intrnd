import { checkpointCompletionModes, roadmapSupportLevels, type CanonicalRoadmapPlan } from "./types.js";

export type RoadmapValidationIssue = { code: string; message: string; checkpointId?: string };

export function validateCanonicalRoadmap(
  value: unknown,
  input: { projectId: string; requiredSubmissionKeys: string[]; catalogEstimatedMinutes?: number },
): RoadmapValidationIssue[] {
  const issues: RoadmapValidationIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [{ code: "ROADMAP_INVALID", message: "Roadmap must be an object." }];
  }
  const plan = value as Partial<CanonicalRoadmapPlan>;
  if (plan.schemaVersion !== 1) issues.push({ code: "ROADMAP_SCHEMA_VERSION_INVALID", message: "Roadmap schemaVersion must be 1." });
  if (plan.projectId !== input.projectId)
    issues.push({ code: "ROADMAP_PROJECT_MISMATCH", message: "Roadmap projectId does not match the project." });
  if (!Number.isInteger(plan.version) || Number(plan.version) < 1)
    issues.push({ code: "ROADMAP_VERSION_INVALID", message: "Roadmap version must be a positive integer." });
  if (!cleanText(plan.authoredBy)) issues.push({ code: "ROADMAP_AUTHOR_REQUIRED", message: "A roadmap author is required." });
  if (!cleanText(plan.reviewedBy))
    issues.push({ code: "ROADMAP_REVIEWER_REQUIRED", message: "An independent roadmap reviewer is required." });
  if (cleanText(plan.authoredBy) && cleanText(plan.authoredBy).toLowerCase() === cleanText(plan.reviewedBy).toLowerCase()) {
    issues.push({ code: "ROADMAP_INDEPENDENT_REVIEWER_REQUIRED", message: "The author and independent reviewer must be different." });
  }
  if (!Array.isArray(plan.checkpoints) || plan.checkpoints.length < 4 || plan.checkpoints.length > 8) {
    issues.push({ code: "ROADMAP_CHECKPOINT_COUNT_INVALID", message: "Roadmaps require 4 to 8 checkpoints." });
    return issues;
  }

  const ids = new Set<string>();
  const allRequirementKeys = new Set<string>();
  for (const checkpoint of plan.checkpoints) {
    const checkpointId = cleanText(checkpoint?.id);
    if (!checkpointId) {
      issues.push({ code: "CHECKPOINT_ID_REQUIRED", message: "Every checkpoint requires a stable ID." });
      continue;
    }
    if (ids.has(checkpointId))
      issues.push({ code: "CHECKPOINT_ID_DUPLICATE", checkpointId, message: `Duplicate checkpoint ID: ${checkpointId}.` });
    ids.add(checkpointId);
    if (!cleanText(checkpoint.title) || !cleanText(checkpoint.objective) || !cleanText(checkpoint.requiredOutput)) {
      issues.push({ code: "CHECKPOINT_CONTENT_REQUIRED", checkpointId, message: "Title, objective, and required output are required." });
    }
    if (
      [checkpoint.title, checkpoint.objective, checkpoint.requiredOutput, ...(checkpoint.definitionOfDone ?? [])].some(
        hasPlaceholderLanguage,
      )
    ) {
      issues.push({
        code: "CHECKPOINT_PLACEHOLDER_LANGUAGE",
        checkpointId,
        message: "Checkpoint content contains placeholder or generic reviewable-result language.",
      });
    }
    if (!checkpointCompletionModes.includes(checkpoint.completionMode)) {
      issues.push({ code: "CHECKPOINT_MODE_INVALID", checkpointId, message: "Checkpoint completion mode is invalid." });
    }
    if (
      !Array.isArray(checkpoint.definitionOfDone) ||
      checkpoint.definitionOfDone.length < 2 ||
      checkpoint.definitionOfDone.some((item) => !cleanText(item))
    ) {
      issues.push({
        code: "CHECKPOINT_DONE_CRITERIA_INVALID",
        checkpointId,
        message: "Each checkpoint requires at least two measurable completion criteria.",
      });
    }
    for (const level of roadmapSupportLevels) {
      if (!Array.isArray(checkpoint.actionsBySupport?.[level]) || checkpoint.actionsBySupport[level].length < 2) {
        issues.push({ code: "CHECKPOINT_ACTIONS_INVALID", checkpointId, message: `${level} requires at least two actions.` });
      }
      if ((checkpoint.actionsBySupport?.[level] ?? []).some(hasPlaceholderLanguage)) {
        issues.push({ code: "CHECKPOINT_ACTION_PLACEHOLDER", checkpointId, message: `${level} actions contain placeholder language.` });
      }
      if (!Number.isInteger(checkpoint.estimatedMinutesBySupport?.[level]) || checkpoint.estimatedMinutesBySupport[level] < 15) {
        issues.push({
          code: "CHECKPOINT_ESTIMATE_INVALID",
          checkpointId,
          message: `${level} requires an estimate of at least 15 minutes.`,
        });
      }
      const resources = checkpoint.resourcesBySupport?.[level];
      if (
        !Array.isArray(resources) ||
        resources.length < 1 ||
        resources.some((resource) => !cleanText(resource.label) || !isApprovedResourceUrl(resource.url))
      ) {
        issues.push({
          code: "CHECKPOINT_RESOURCES_INVALID",
          checkpointId,
          message: `${level} requires labeled HTTPS resources from approved sources.`,
        });
      }
    }
    for (const key of checkpoint.submissionRequirementKeys ?? []) allRequirementKeys.add(key);
  }

  for (const checkpoint of plan.checkpoints) {
    const checkpointIndex = plan.checkpoints.findIndex((item) => item.id === checkpoint.id);
    for (const prerequisite of checkpoint.prerequisiteCheckpointIds ?? []) {
      if (!ids.has(prerequisite))
        issues.push({
          code: "CHECKPOINT_PREREQUISITE_UNKNOWN",
          checkpointId: checkpoint.id,
          message: `Unknown prerequisite: ${prerequisite}.`,
        });
      if (prerequisite === checkpoint.id)
        issues.push({
          code: "CHECKPOINT_PREREQUISITE_SELF",
          checkpointId: checkpoint.id,
          message: "A checkpoint cannot depend on itself.",
        });
      const prerequisiteIndex = plan.checkpoints.findIndex((item) => item.id === prerequisite);
      if (prerequisiteIndex >= checkpointIndex && prerequisiteIndex >= 0)
        issues.push({
          code: "CHECKPOINT_PREREQUISITE_ORDER_INVALID",
          checkpointId: checkpoint.id,
          message: "Prerequisites must refer to an earlier checkpoint.",
        });
    }
  }

  const finalCheckpoint = plan.checkpoints.at(-1)!;
  if (finalCheckpoint.completionMode !== "EVIDENCE")
    issues.push({
      code: "ROADMAP_FINAL_EVIDENCE_REQUIRED",
      checkpointId: finalCheckpoint.id,
      message: "The final checkpoint must require evidence.",
    });
  if (
    !plan.checkpoints.slice(0, -1).some((checkpoint) => checkpoint.completionMode === "NOTE" || checkpoint.completionMode === "EVIDENCE")
  ) {
    issues.push({ code: "ROADMAP_OUTPUT_MILESTONE_REQUIRED", message: "At least one earlier checkpoint must require a note or evidence." });
  }
  for (const key of input.requiredSubmissionKeys) {
    if (!allRequirementKeys.has(key))
      issues.push({ code: "ROADMAP_SUBMISSION_KEY_UNMAPPED", message: `Required submission key is not mapped: ${key}.` });
    if (!finalCheckpoint.submissionRequirementKeys.includes(key))
      issues.push({
        code: "ROADMAP_FINAL_KEY_UNMAPPED",
        checkpointId: finalCheckpoint.id,
        message: `Final checkpoint must verify submission key: ${key}.`,
      });
  }
  const unknownKeys = [...allRequirementKeys].filter((key) => !input.requiredSubmissionKeys.includes(key));
  for (const key of unknownKeys)
    issues.push({ code: "ROADMAP_SUBMISSION_KEY_UNKNOWN", message: `Unknown submission requirement key: ${key}.` });
  if (input.catalogEstimatedMinutes && input.catalogEstimatedMinutes > 0) {
    const standardMinutes = plan.checkpoints.reduce(
      (total, checkpoint) => total + Number(checkpoint.estimatedMinutesBySupport?.STANDARD ?? 0),
      0,
    );
    const difference = Math.abs(standardMinutes - input.catalogEstimatedMinutes) / input.catalogEstimatedMinutes;
    if (difference > 0.2)
      issues.push({
        code: "ROADMAP_SCHEDULE_MISMATCH",
        message: "Standard checkpoint effort at five hours per week differs from the catalog duration by more than 20%.",
      });
  }
  return issues;
}

export function parseCanonicalRoadmap(
  value: unknown,
  input: { projectId: string; requiredSubmissionKeys: string[]; catalogEstimatedMinutes?: number },
) {
  const issues = validateCanonicalRoadmap(value, input);
  return issues.length ? { plan: null, issues } : { plan: value as CanonicalRoadmapPlan, issues: [] };
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const APPROVED_RESOURCE_DOMAINS = [
  "docs.github.com",
  "developer.mozilla.org",
  "docs.python.org",
  "scikit-learn.org",
  "pandas.pydata.org",
  "mbta.com",
  "owasp.org",
  "github.com",
  "portswigger.net",
  "docs.arduino.cc",
  "autodesk.com",
  "mathworks.com",
  "sec.gov",
  "developers.google.com",
  "w3.org",
  "help.figma.com",
  "data.cdc.gov",
  "dol.gov",
  "congress.gov",
  "data.census.gov",
  "lean.org",
  "zotero.org",
  "canva.com",
  "plainlanguage.gov",
  "learn.microsoft.com",
  "epa.gov",
  "edaplayground.com",
  "verilator.org",
  "analog.com",
  "allaboutcircuits.com",
  "octave.org",
  "simscale.com",
  "ansys.com",
  "blackmagicdesign.com",
  "bbc.co.uk",
  "react.dev",
  "nodejs.org",
  "expressjs.com",
  "postgresql.org",
  "render.com",
  "postman.com",
  "swagger.io",
  "creativecommons.org",
  "freecad.org",
  "libreoffice.org",
  "projectlibre.com",
  "treasury.gov",
  "nyu.edu",
  "nasdaq.com",
  "huduser.gov",
  "redfin.com",
  "bls.gov",
  "microsoft.com",
  "google.com",
  "nextjs.org",
  "astro.build",
  "vercel.com",
  "uci.edu",
  "fairlearn.org",
  "readthedocs.io",
  "streamlit.io",
  "cdc.gov",
  "openml.org",
  "scipy.org",
  "ietf.org",
  "nist.gov",
  "wireshark.org",
  "wokwi.com",
  "librecad.org",
  "finra.org",
  "sba.gov",
  "energy.gov",
  "eia.gov",
  "mit.edu",
  "tableau.com",
  "chicago.gov",
  "amlegal.com",
  "supremecourt.gov",
  "courtlistener.com",
  "nngroup.com",
  "deque.com",
  "developer.chrome.com",
  "oercommons.org",
  "pressbooks.com",
  "rcfp.org",
  "foia.gov",
  "octave.sourceforge.io",
  "access-board.gov",
  "osha.gov",
  "pewresearch.org",
  "aapor.org",
] as const;

function isApprovedResourceUrl(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return url.protocol === "https:" && APPROVED_RESOURCE_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

function hasPlaceholderLanguage(value: unknown) {
  return typeof value === "string" && /\b(?:tbd|todo|lorem ipsum|placeholder|reviewable result)\b/i.test(value);
}
