import assert from "node:assert/strict";
import { calculateCohortMetrics } from "./cohortMetrics.js";

const at = (hours: number) => new Date(Date.UTC(2026, 6, 1, hours));
const event = (
  id: string,
  userId: string,
  eventType: string,
  hours: number,
  extra: Partial<{ applicationId: string; submissionId: string; properties: Record<string, unknown> }> = {},
) => ({
  id,
  userId,
  eventType,
  applicationId: extra.applicationId ?? null,
  submissionId: extra.submissionId ?? null,
  properties: extra.properties ?? null,
  occurredAt: at(hours),
});

const result = calculateCohortMetrics({
  members: [
    { id: "u1", cohortJoinedAt: at(0) },
    { id: "u2", cohortJoinedAt: at(0) },
  ],
  events: [
    event("e1", "u1", "RECOMMENDATION_IMPRESSION", 1),
    event("e1-duplicate", "u1", "RECOMMENDATION_IMPRESSION", 2),
    event("e2", "u1", "PROJECT_STARTED", 3, { applicationId: "a1" }),
    event("e-config", "u1", "ROADMAP_CONFIGURED", 3, { applicationId: "a1", properties: { supportLevel: "GUIDED" } }),
    event("e-view", "u1", "CHECKPOINT_VIEWED", 4, { applicationId: "a1", properties: { checkpointId: "P001:v1:scope" } }),
    event("e-complete", "u1", "CHECKPOINT_COMPLETED", 5, {
      applicationId: "a1",
      properties: { checkpointId: "P001:v1:scope", estimatedMinutes: 90 },
    }),
    event("e-feedback", "u1", "ROADMAP_FEEDBACK_RECORDED", 6, {
      applicationId: "a1",
      properties: { checkpointId: "P001:v1:scope", helpful: true, issueCode: "NONE" },
    }),
    event("e-evidence-fail", "u1", "CHECKPOINT_EVIDENCE_VALIDATION_FAILED", 7, {
      applicationId: "a1",
      properties: { checkpointId: "P001:v1:package" },
    }),
    event("e3", "u1", "SUBMISSION_FINALIZED", 8, { applicationId: "a1", submissionId: "s1" }),
    event("e4", "u1", "REVIEW_COMPLETED", 10, {
      applicationId: "a1",
      submissionId: "s1",
      properties: { decision: "NEEDS_REVISION", reviewerName: "Reviewer A" },
    }),
    event("e5", "u1", "SUBMISSION_FINALIZED", 14, { applicationId: "a1", submissionId: "s2" }),
    event("e6", "u1", "REVIEW_COMPLETED", 16, {
      applicationId: "a1",
      submissionId: "s2",
      properties: { decision: "VERIFIED", reviewerName: "Reviewer A" },
    }),
    event("e7", "u1", "PROOF_VIEWED", 17),
    event("e8", "u1", "RESUME_BULLET_COPIED", 18),
  ],
  reviewedSubmissions: [
    { id: "s1", submittedAt: at(8), reviewedBy: "reviewer-1", reviewerName: "Reviewer A" },
    { id: "s2", submittedAt: at(14), reviewedBy: "reviewer-1", reviewerName: "Reviewer A" },
  ],
  reviewSlaHours: 48,
});

assert.equal(result.funnel.enrolled.count, 2);
assert.equal(result.funnel.recommendations.count, 1);
assert.equal(result.funnel.started.conversionFromPrevious, 1);
assert.equal(result.funnel.verified.conversionFromEnrolled, 0.5);
assert.deepEqual(
  result.stageTiming.map((stage) => stage.medianHours),
  [1, 2, 5, 8],
);
assert.equal(result.reviewSla.complianceRate, 1);
assert.equal(result.revisionRate, 0.5);
assert.deepEqual(result.reviewerWorkload, [{ reviewerId: "reviewer-1", reviewer: "Reviewer A", reviews: 2 }]);
assert.deepEqual(result.engagement.proofViews, { total: 1, uniqueUsers: 1 });
assert.equal(result.eventIntegrity.noDuplicates, false);
assert.equal(result.eventIntegrity.duplicateFunnelEvents, 1);
assert.equal(result.roadmaps.checkpointDropoff[0].completionRate, 1);
assert.equal(result.roadmaps.completionTiming.medianActualMinutes, 60);
assert.equal(result.roadmaps.completionTiming.medianEstimatedMinutes, 90);
assert.equal(result.roadmaps.completionTiming.withinTwiceEstimateRate, 1);
assert.equal(result.roadmaps.evidenceValidationFailures, 1);
assert.equal(result.roadmaps.feedback.helpfulRate, 1);
assert.deepEqual(result.roadmaps.outcomesBySupport[0], { supportLevel: "GUIDED", configured: 1, submitted: 1, verified: 1 });

console.log("cohort metrics tests passed");
