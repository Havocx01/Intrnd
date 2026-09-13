import assert from "node:assert/strict";
import { pilotCatalogProjectWhere, isPilotCatalogEligible, normalizePilotCatalogMode } from "./eligibility.js";
import { PILOT_CATALOG_V1, pilotCatalogRiskCodes } from "./manifest.js";
import { isCurrentQualifiedAssignment, normalizeCatalogReview, pilotPublishReadiness } from "./validation.js";
import { PILOT_CAREER_MAPPINGS_V1 } from "../career/pilotMappings.v1.js";
import { validateCareerMapping } from "../career/mapping.js";
import { CAREER_TAXONOMY_VERSION, resolveRoleIds } from "../career/taxonomy.js";

const ids = PILOT_CATALOG_V1.map((entry) => entry.projectId);
assert.equal(new Set(ids).size, ids.length, "Pilot catalog project IDs must be unique.");
assert.ok(ids.length >= 40 && ids.length <= 60, "The review pool should remain deliberately narrower than the full catalog.");
for (const entry of PILOT_CATALOG_V1) {
  assert.match(entry.projectId, /^P\d{3}$/);
  assert.ok(entry.reason.length >= 40, `${entry.projectId} needs a meaningful curation reason.`);
  assert.ok(entry.riskCodes.every((code) => pilotCatalogRiskCodes.includes(code)));
}
assert.deepEqual(Object.keys(PILOT_CAREER_MAPPINGS_V1).sort(), [...ids].sort(), "Every pilot candidate needs one explicit career mapping.");
for (const [projectId, mapping] of Object.entries(PILOT_CAREER_MAPPINGS_V1)) {
  assert.equal(mapping.careerTaxonomyVersion, CAREER_TAXONOMY_VERSION);
  assert.deepEqual(
    validateCareerMapping(mapping, mapping.recommendedExperienceLevels[0]).filter((issue) => issue.severity === "ERROR"),
    [],
    `${projectId} career mapping must be structurally valid.`,
  );
}
assert.deepEqual(resolveRoleIds(["Backend Engineer"]), ["backend-developer"]);

assert.equal(normalizePilotCatalogMode(undefined, false), "CANDIDATES");
assert.equal(normalizePilotCatalogMode(undefined, true), "READY_ONLY");
assert.equal(normalizePilotCatalogMode("all", true), "ALL");
assert.deepEqual(pilotCatalogProjectWhere("READY_ONLY"), { pilotCatalogStatus: "PILOT_READY", pilotCatalogVersion: 1 });
assert.equal(isPilotCatalogEligible({ pilotCatalogStatus: "CANDIDATE", pilotCatalogVersion: 1 }, "CANDIDATES"), true);
assert.equal(isPilotCatalogEligible({ pilotCatalogStatus: "CANDIDATE", pilotCatalogVersion: 1 }, "READY_ONLY"), false);

const approval = normalizeCatalogReview({
  decision: "APPROVE",
  relevance: 4,
  feasibility: 5,
  proofValue: 4,
  readiness: 5,
  sourceTruth: true,
  resourceAccess: true,
  safeScope: true,
  issueCodes: [],
  notes: "The scope, resources, proof outcome, and reviewer criteria are all concrete and pilot-appropriate.",
  confidence: 5,
  noConflictConfirmed: true,
  scoreJustifications: {},
});
assert.ok(approval.review);
const weakWithoutJustification = normalizeCatalogReview({ ...approval.review, decision: "CHANGES_REQUESTED", readiness: 3 });
assert.equal(weakWithoutJustification.review, null);
assert.match(weakWithoutJustification.error ?? "", /justification/i);
assert.equal(normalizeCatalogReview({ ...approval.review, confidence: 3 }).review, null, "low-confidence approvals must be rejected");
assert.equal(
  normalizeCatalogReview({ ...approval.review, noConflictConfirmed: false }).review,
  null,
  "every review must affirm no conflict",
);

const qualifiedDomainAssignment = {
  reviewType: "DOMAIN",
  reviewer: {
    role: "REVIEWER",
    catalogReviewerProfile: { active: true, reviewerTypes: ["DOMAIN"], domainExpertiseIds: ["software"], careerExpertiseIds: [] },
  },
};
assert.equal(isCurrentQualifiedAssignment(["backend-developer"], qualifiedDomainAssignment), true);
assert.equal(
  isCurrentQualifiedAssignment(["financial-analyst"], qualifiedDomainAssignment),
  false,
  "domain expertise must overlap the mapped role domain",
);
assert.equal(
  isCurrentQualifiedAssignment(["backend-developer"], {
    ...qualifiedDomainAssignment,
    reviewer: {
      ...qualifiedDomainAssignment.reviewer,
      catalogReviewerProfile: { ...qualifiedDomainAssignment.reviewer.catalogReviewerProfile, active: false },
    },
  }),
  false,
  "inactive reviewers must not remain qualified",
);

const fingerprint = "project-fingerprint";
const confirmedAt = new Date().toISOString();
const aiDomainReview = {
  reviewerId: "ai-a",
  reviewType: "DOMAIN",
  decision: "APPROVE",
  projectFingerprint: fingerprint,
  confidence: 5,
  conflictConfirmedAt: confirmedAt,
  reviewerKind: "AI_AGENT",
};
const aiCareerReview = {
  reviewerId: "ai-b",
  reviewType: "CAREER",
  decision: "APPROVE",
  projectFingerprint: fingerprint,
  confidence: 4,
  conflictConfirmedAt: confirmedAt,
  reviewerKind: "AI_AGENT",
};
const humanDomainReview = {
  reviewerId: "human-a",
  reviewType: "DOMAIN",
  decision: "APPROVE",
  projectFingerprint: fingerprint,
  confidence: 5,
  conflictConfirmedAt: confirmedAt,
  reviewerKind: "HUMAN",
};
const humanCareerReview = {
  reviewerId: "human-b",
  reviewType: "CAREER",
  decision: "APPROVE",
  projectFingerprint: fingerprint,
  confidence: 4,
  conflictConfirmedAt: confirmedAt,
  reviewerKind: "HUMAN",
};
const aiAssignments = [
  { reviewerId: "ai-a", reviewType: "DOMAIN", qualified: true, reviewerKind: "AI_AGENT" },
  { reviewerId: "ai-b", reviewType: "CAREER", qualified: true, reviewerKind: "AI_AGENT" },
];
const humanAssignments = [
  { reviewerId: "human-a", reviewType: "DOMAIN", qualified: true, reviewerKind: "HUMAN" },
  { reviewerId: "human-b", reviewType: "CAREER", qualified: true, reviewerKind: "HUMAN" },
];
const oneReviewer = pilotPublishReadiness({
  projectIssues: [],
  projectFingerprint: fingerprint,
  reviews: [aiDomainReview],
  assignments: aiAssignments,
});
assert.equal(oneReviewer.ready, false);
assert.ok(oneReviewer.reasons.includes("AI_CAREER_APPROVAL_REQUIRED"));
const twoReviewers = pilotPublishReadiness({
  projectIssues: [],
  projectFingerprint: fingerprint,
  reviews: [aiDomainReview, aiCareerReview],
  assignments: aiAssignments,
});
assert.equal(twoReviewers.ready, true);
assert.equal(twoReviewers.approvingReviewers, 2);
const sensitiveAiReviewers = pilotPublishReadiness({
  projectIssues: [],
  projectFingerprint: fingerprint,
  reviews: [aiDomainReview, aiCareerReview],
  assignments: aiAssignments,
  riskCodes: ["SENSITIVE_DOMAIN"],
});
assert.equal(sensitiveAiReviewers.ready, false);
assert.ok(sensitiveAiReviewers.reasons.includes("DOMAIN_REVIEWER_UNASSIGNED"));
assert.ok(sensitiveAiReviewers.reasons.includes("CAREER_REVIEWER_UNASSIGNED"));
assert.equal(
  pilotPublishReadiness({
    projectIssues: [],
    projectFingerprint: fingerprint,
    reviews: [aiDomainReview, aiCareerReview, humanDomainReview, humanCareerReview],
    assignments: humanAssignments,
    riskCodes: ["SENSITIVE_DOMAIN"],
  }).ready,
  true,
  "AI pre-approval plus two qualified human approvals should satisfy escalated review",
);
assert.equal(
  pilotPublishReadiness({
    projectIssues: [],
    projectFingerprint: fingerprint,
    reviews: [humanDomainReview, humanCareerReview],
    assignments: humanAssignments,
  }).ready,
  false,
  "human reviews must not replace the universal AI pre-review",
);
assert.equal(
  pilotPublishReadiness({
    projectIssues: [],
    projectFingerprint: fingerprint,
    reviews: [aiDomainReview, aiCareerReview],
    assignments: aiAssignments,
  }).ready,
  true,
  "AI approvals should remain valid for non-escalated projects",
);
const deactivatedReviewer = pilotPublishReadiness({
  projectIssues: [],
  projectFingerprint: fingerprint,
  reviews: [aiDomainReview, aiCareerReview, humanDomainReview, humanCareerReview],
  assignments: [{ ...humanAssignments[0], qualified: false }, humanAssignments[1]],
  riskCodes: ["SENSITIVE_DOMAIN"],
});
assert.equal(deactivatedReviewer.ready, false);
assert.ok(deactivatedReviewer.reasons.includes("DOMAIN_REVIEWER_NOT_QUALIFIED"));
const sameReviewer = pilotPublishReadiness({
  projectIssues: [],
  projectFingerprint: fingerprint,
  reviews: [aiDomainReview, { ...aiCareerReview, reviewerId: "ai-a" }],
  assignments: [aiAssignments[0], { ...aiAssignments[1], reviewerId: "ai-a" }],
});
assert.equal(sameReviewer.ready, false);
assert.ok(sameReviewer.reasons.includes("DISTINCT_AI_REVIEWERS_REQUIRED"));
assert.equal(
  pilotPublishReadiness({
    projectIssues: [{ severity: "ERROR", code: "BROKEN", message: "Broken." }],
    projectFingerprint: fingerprint,
    reviews: [aiDomainReview, aiCareerReview],
    assignments: aiAssignments,
  }).ready,
  false,
);
assert.equal(
  pilotPublishReadiness({
    projectIssues: [],
    projectFingerprint: fingerprint,
    reviews: [
      { ...aiDomainReview, projectFingerprint: "old-content" },
      { ...aiCareerReview, projectFingerprint: "old-content" },
    ],
    assignments: aiAssignments,
  }).ready,
  false,
);

console.log("pilot catalog tests passed");
