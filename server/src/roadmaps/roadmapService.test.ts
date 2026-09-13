import assert from "node:assert/strict";
import { prisma } from "../db/prisma.js";
import { normalizeSubmissionRequirements } from "../submissions/requirements.js";
import { estimateCatalogMinutes } from "./catalog.js";
import { ROADMAP_CATALOG_V1 } from "./catalog.v1.generated.js";
import {
  checkpointCompletionError,
  defaultRoadmapPreferences,
  emptyCheckpointProgress,
  normalizeCheckpointProgress,
  normalizeRoadmapPreferences,
  personalizeRoadmap,
} from "./roadmapService.js";
import { validateCanonicalRoadmap } from "./validation.js";
import { buildRoadmapPreview } from "../projects/projectPresentation.js";

const projectIds: string[] = [];
for (let projectNumber = 1; projectNumber <= 130; projectNumber++) {
  projectIds.push(`P${String(projectNumber).padStart(3, "0")}`);
}

const projects = await prisma.project.findMany({
  where: { id: { in: projectIds }, status: "PUBLISHED", moderationStatus: "APPROVED" },
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
  },
  orderBy: { id: "asc" },
});

assert.equal(projects.length, 130, "seed the included catalog and sync its roadmaps before running this test");
assert.equal(Object.keys(ROADMAP_CATALOG_V1).length, 139, "the version-controlled v1 artifact must contain 139 keyed roadmaps");
let requiredEvidenceCount = 0;
let mappedEvidenceCount = 0;

for (const project of projects) {
  const requirements = normalizeSubmissionRequirements(project.submissionRequirements, project.deliverable);
  const requiredKeys = requirements.items.filter((item) => item.required).map((item) => item.key);
  const plan = ROADMAP_CATALOG_V1[project.id];
  assert.ok(plan, `${project.id} is missing from the version-controlled v1 artifact`);
  if (project.category === "Retail") {
    assert.equal(
      plan.checkpoints[2]?.title,
      "Build the retail intervention and analysis",
      `${project.id} must use the Retail roadmap recipe rather than substring-matching AI`,
    );
  }
  const issues = validateCanonicalRoadmap(plan, {
    projectId: project.id,
    requiredSubmissionKeys: requiredKeys,
    catalogEstimatedMinutes: estimateCatalogMinutes(project.estimatedHours),
  });
  assert.deepEqual(issues, [], `${project.id} has roadmap validation errors: ${JSON.stringify(issues)}`);
  const checkpointIds = plan.checkpoints.map((checkpoint) => checkpoint.id);
  assert.equal(new Set(checkpointIds).size, checkpointIds.length, `${project.id} checkpoint IDs must be unique`);
  assert.equal(plan.checkpoints.at(-1)?.completionMode, "EVIDENCE");
  const preview = buildRoadmapPreview(project.checkpointPlan, 5);
  assert.ok(preview, `${project.id} must produce a roadmap preview`);
  assert.deepEqual(
    preview.checkpoints.map((checkpoint) => checkpoint.id),
    plan.checkpoints.map((checkpoint) => checkpoint.id),
  );
  assert.equal(preview.checkpointCount, plan.checkpoints.length);
  assert.ok(preview.totalEstimatedMinutes > 0);
  const mappedKeys = new Set(plan.checkpoints.flatMap((checkpoint) => checkpoint.submissionRequirementKeys));
  requiredEvidenceCount += requiredKeys.length;
  mappedEvidenceCount += requiredKeys.filter((key) => mappedKeys.has(key)).length;
}

assert.equal(requiredEvidenceCount, 234, "included catalog evidence count changed; review roadmap mappings intentionally");
assert.equal(mappedEvidenceCount, requiredEvidenceCount, "every required submission item must map to a checkpoint");

const evidenceKindsByProject: Record<string, string[]> = {
  P004: ["REPOSITORY", "LINK", "LINK", "DOCUMENT"],
  P029: ["FILE", "DOCUMENT"],
  P039: ["REPOSITORY", "LINK", "DOCUMENT"],
  P040: ["REPOSITORY", "LINK", "DOCUMENT"],
  P051: ["FILE", "IMAGE", "DOCUMENT"],
  P052: ["FILE", "DOCUMENT"],
  P057: ["FILE", "DOCUMENT", "IMAGE"],
  P059: ["FILE", "DOCUMENT"],
  P061: ["FILE", "DOCUMENT"],
  P063: ["FILE", "DOCUMENT", "DOCUMENT"],
  P066: ["FILE", "DOCUMENT", "DOCUMENT"],
  P088: ["FILE", "DOCUMENT"],
  P093: ["LINK", "FILE", "DOCUMENT"],
  P095: ["FILE", "DOCUMENT"],
  P101: ["LINK", "DOCUMENT", "IMAGE"],
  P102: ["LINK", "DOCUMENT"],
  P107: ["LINK", "FILE", "DOCUMENT"],
  P111: ["LINK", "DOCUMENT"],
  P113: ["FILE", "IMAGE", "DOCUMENT"],
  P114: ["DOCUMENT"],
};
for (const [projectId, expectedKinds] of Object.entries(evidenceKindsByProject)) {
  const project = projects.find((entry) => entry.id === projectId);
  assert.ok(project, `${projectId} must exist`);
  const requirements = normalizeSubmissionRequirements(project.submissionRequirements, project.deliverable);
  assert.deepEqual(
    requirements.items.map((item) => item.kind),
    expectedKinds,
    `${projectId} evidence contract changed`,
  );
}

const remediationSignals: Record<string, string> = {
  P004: "Render free services and limits",
  P006: "three substantive posts",
  P014: "UCI Student Performance dataset",
  P019: "Streamlit",
  P022: "minimum reportable subgroup size of 30",
  P023: "ecological associations only",
  P027: "2,000 synthetic visitors",
  P028: "OpenML dataset 42178",
  P029: "EPA Emission Factors Hub",
  P007: "OpenAPI 3 specification guide",
  P036: "RFC 5737 TEST-NET",
  P038: "student's own isolated local machine",
  P039: "simulation-only",
  P040: "guaranteed Wokwi path",
  P047: "non-isolated buck converter",
  P048: "passband ripple",
  P051: "printing is optional",
  P052: "1,000 N downward",
  P057: "site permission",
  P059: "ProjectLibre",
  P061: "20-by-30-foot room",
  P063: "valuation date",
  P066: "Nasdaq public market data",
  P070: "Apple Inc. 4.45% Notes",
  P071: "entirely fictional brand",
  P076: "fixed evidence matrix",
  P079: "residential heat-pump retrofit services",
  P083: "four-echelon spreadsheet",
  P086: "two adjacent 10-case slots",
  P087: "property-level",
  P088: "Year 6 NOI",
  P090: "NHANES 2017-2018",
  P093: "Tableau Public",
  P095: "BLS OEWS wage data",
  P096: "Google Forms",
  P098: "City of Chicago",
  P100: "Loper Bright",
  P101: "fictional baseline",
  P102: "heuristic fallback",
  P104: "WCAG 2.2 AA",
  P107: "Creative Commons",
  P110: "public-records-only fallback",
  P111: "Microsoft Clipchamp help",
  P113: "weighted propensity",
  P114: "live A/B test",
};
for (const [projectId, signal] of Object.entries(remediationSignals)) {
  assert.ok(
    JSON.stringify(ROADMAP_CATALOG_V1[projectId]).toLowerCase().includes(signal.toLowerCase()),
    `${projectId} roadmap must preserve DOMAIN remediation signal: ${signal}`,
  );
}

const sampleProject = projects[0];
const samplePlan = ROADMAP_CATALOG_V1[sampleProject.id];
const generatedAt = new Date("2026-08-02T12:00:00.000Z");
const profile = {
  major: "Computer Science",
  currentSkills: "GitHub, Python",
  skillsToBuild: "testing, communication",
  targetRoles: "Software Engineer",
  projectPreferences: "hands-on projects",
};
const preferences = { weeklyHours: 5, supportLevel: "STANDARD" as const };
assert.deepEqual(defaultRoadmapPreferences(), preferences, "students without saved defaults use the safe standard pace");
assert.deepEqual(normalizeRoadmapPreferences({ weeklyHours: 8, supportLevel: "guided" }), { weeklyHours: 8, supportLevel: "GUIDED" });
assert.equal(normalizeRoadmapPreferences({ weeklyHours: 0, supportLevel: "STANDARD" }), null);
const snapshotA = personalizeRoadmap(samplePlan, preferences, profile, generatedAt);
const snapshotB = personalizeRoadmap(samplePlan, preferences, profile, generatedAt);
assert.deepEqual(snapshotA, snapshotB, "personalization must be deterministic for the same saved inputs");
assert.equal(snapshotA.schemaVersion, 2);
assert.equal(snapshotA.profileFeatureVersion, "profile-v1");
assert.ok(snapshotA.profileFeatureHash);
assert.ok(snapshotA.personalizationSummary.pace.includes("5 hours"));
assert.equal(snapshotA.checkpoints.length, samplePlan.checkpoints.length);

const progress = emptyCheckpointProgress(snapshotA);
progress.entries[0].completed = true;
progress.entries[0].completedAt = generatedAt.toISOString();
progress.entries[0].note = "A sufficiently detailed scoping decision for this project.";
const accelerated = personalizeRoadmap(samplePlan, { weeklyHours: 10, supportLevel: "ACCELERATED" }, profile, generatedAt);
const preserved = normalizeCheckpointProgress(progress, accelerated);
assert.equal(preserved.entries[0].completed, true, "preference changes must preserve completion");
assert.equal(preserved.entries[0].note, progress.entries[0].note, "preference changes must preserve notes");
assert.deepEqual(
  preserved.entries.map((entry) => entry.checkpointId),
  accelerated.checkpoints.map((checkpoint) => checkpoint.id),
);

const secondCheckpoint = snapshotA.checkpoints[1];
assert.equal(
  checkpointCompletionError({ checkpoint: secondCheckpoint, progress: emptyCheckpointProgress(snapshotA), completed: true, note: null }),
  "CHECKPOINT_PREREQUISITE_INCOMPLETE",
);
const noteCheckpoint = snapshotA.checkpoints.find((checkpoint) => checkpoint.completionMode === "NOTE")!;
assert.equal(
  checkpointCompletionError({
    checkpoint: noteCheckpoint,
    progress: emptyCheckpointProgress(snapshotA),
    completed: true,
    note: "too short",
  }),
  "CHECKPOINT_NOTE_REQUIRED",
);
const evidenceCheckpoint = snapshotA.checkpoints.at(-1)!;
const prereqsComplete = emptyCheckpointProgress(snapshotA);
for (const entry of prereqsComplete.entries.slice(0, -1)) entry.completed = true;
assert.equal(
  checkpointCompletionError({
    checkpoint: evidenceCheckpoint,
    progress: prereqsComplete,
    completed: true,
    note: null,
    missingEvidenceKeys: ["missing"],
  }),
  "CHECKPOINT_EVIDENCE_REQUIRED",
);
assert.equal(
  checkpointCompletionError({
    checkpoint: evidenceCheckpoint,
    progress: prereqsComplete,
    completed: true,
    note: null,
    missingEvidenceKeys: [],
  }),
  null,
);

console.log(`roadmap tests passed: ${projects.length}/130 projects and ${mappedEvidenceCount}/${requiredEvidenceCount} evidence mappings`);
await prisma.$disconnect();
