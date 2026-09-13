import assert from "node:assert/strict";
import { buildRoadmapPreview, sourceVerification } from "./projectPresentation.js";
import { validateProjectProvenance } from "./provenance.js";
import { sanitizeLockedProject } from "../lib/lockedProjects.js";

const preview = buildRoadmapPreview(
  {
    schemaVersion: 1,
    checkpoints: [
      {
        id: "scope",
        title: "Define the scope",
        objective: "Choose the user and boundary.",
        requiredOutput: "Written scope",
        estimatedMinutesBySupport: { STANDARD: 90 },
      },
      {
        id: "build",
        title: "Build the artifact",
        objective: "Create the working result.",
        requiredOutput: "Working artifact",
        estimatedMinutesBySupport: { STANDARD: 210 },
      },
    ],
  },
  5,
);
assert.deepEqual(
  preview?.checkpoints.map((checkpoint) => checkpoint.title),
  ["Define the scope", "Build the artifact"],
);
assert.equal(preview?.checkpointCount, 2);
assert.equal(preview?.totalEstimatedMinutes, 300);
assert.equal(preview?.effortLabel, "5 hours");
assert.equal(preview?.scheduleLabel, "About 1 week at 5 hours/week");
assert.equal(buildRoadmapPreview({ items: [{ title: "Upload a report" }] }), null, "submission requirements are not roadmap checkpoints");

assert.equal(sourceVerification({ sourceType: "INTRND_CREATED" }).label, "Intrnd-created practice project");
assert.equal(sourceVerification({ sourceType: "ON_CAMPUS" }).label, "Campus-style project");
assert.equal(sourceVerification({ sourceType: "THIRD_PARTY" }).status, "CATALOG_ONLY");
assert.equal(
  sourceVerification({
    sourceType: "ON_CAMPUS",
    provenanceStatus: "LIVE_EXTERNAL",
    externalUrl: "https://example.edu/project",
    lastSeenAt: "2026-08-01",
  }).status,
  "SOURCE_VERIFIED",
);
assert.equal(
  sourceVerification({ sourceType: "ON_CAMPUS", externalUrl: "http://example.edu/project", lastSeenAt: "2026-08-01" }).status,
  "CATALOG_ONLY",
);
assert.equal(sourceVerification({ sourceType: "ORGANIZATION_POSTED", provenanceStatus: "PARTNER_BACKED" }).label, "Partner-backed project");
assert.equal(sourceVerification({ sourceType: "ON_CAMPUS", provenanceStatus: "PRACTICE" }).status, "INTRND_AUTHORED");

assert.deepEqual(validateProjectProvenance({ provenanceStatus: "PRACTICE" }), []);
assert.deepEqual(validateProjectProvenance({ provenanceStatus: "PARTNER_BACKED", organizationId: "org-1" }), []);
assert.equal(validateProjectProvenance({ provenanceStatus: "PARTNER_BACKED" })[0]?.code, "PROJECT_PARTNER_REQUIRED");
assert.deepEqual(
  validateProjectProvenance({ provenanceStatus: "LIVE_EXTERNAL", externalUrl: "https://example.edu/project", lastSeenAt: "2026-08-01" }),
  [],
);
assert.deepEqual(
  validateProjectProvenance({ provenanceStatus: "LIVE_EXTERNAL", externalUrl: "http://example.edu/project" }).map((issue) => issue.code),
  ["PROJECT_SOURCE_URL_REQUIRED", "PROJECT_SOURCE_CHECK_REQUIRED"],
);

const locked = sanitizeLockedProject({
  id: "project-1",
  title: "Exact project title",
  description: "Exact brief",
  organizationName: null,
  category: "Technology",
  sourceType: "INTRND_CREATED",
  difficulty: "BEGINNER",
  majorTags: [],
  interestTags: [],
  skillTags: [],
  deliverable: "Repository",
  skills: ["TypeScript"],
  verificationType: "INTRND_REVIEW",
  verificationMethod: "Admin review",
  roadmapPreview: preview,
});
assert.equal(locked.roadmapPreview, undefined, "locked projects must not expose canonical roadmap summaries");

console.log("project presentation accuracy tests passed");
