import { createHash } from "node:crypto";
import { normalizeSubmissionRequirements } from "../submissions/requirements.js";
import { validateCanonicalRoadmap } from "../roadmaps/validation.js";
import { validateProjectProvenance } from "../projects/provenance.js";
import { humanReviewRiskCodes, pilotCatalogCandidate, pilotCatalogRiskCodes, type PilotCatalogRiskCode } from "./manifest.js";
import { validateCareerMapping } from "../career/mapping.js";
import { careerReviewerExpertise, roleDomainIds } from "../career/taxonomy.js";

export const pilotCatalogDecisions = ["APPROVE", "CHANGES_REQUESTED", "REJECT"] as const;
export type PilotCatalogDecision = (typeof pilotCatalogDecisions)[number];

export type PilotCatalogIssue = { severity: "ERROR" | "WARNING"; code: string; message: string };

type AssignmentReviewer = {
  role?: string;
  catalogReviewerProfile?: {
    reviewerTypes: string[];
    domainExpertiseIds: string[];
    careerExpertiseIds: string[];
    active: boolean;
    reviewerKind?: string;
  } | null;
};

export function isCurrentQualifiedAssignment(
  targetRoleIds: string[],
  assignment: { reviewType: string; reviewer?: AssignmentReviewer | null },
) {
  const profile = assignment.reviewer?.catalogReviewerProfile;
  if (
    !profile?.active ||
    !["ADMIN", "REVIEWER"].includes(assignment.reviewer?.role ?? "") ||
    !profile.reviewerTypes.includes(assignment.reviewType)
  )
    return false;
  if (assignment.reviewType === "DOMAIN") {
    const projectDomains = roleDomainIds(targetRoleIds);
    return projectDomains.some((domainId) => profile.domainExpertiseIds.includes(domainId));
  }
  if (assignment.reviewType === "CAREER") {
    const recognized = new Set(careerReviewerExpertise.map((entry) => entry.id));
    return profile.careerExpertiseIds.some((expertiseId) => recognized.has(expertiseId));
  }
  return false;
}

export type PilotCatalogProjectInput = {
  id: string;
  title: string;
  description: string;
  status: string;
  moderationStatus: string;
  isStarter: boolean;
  provenanceStatus: string;
  organizationId?: string | null;
  externalUrl?: string | null;
  scrapedAt?: Date | string | null;
  lastSeenAt?: Date | string | null;
  category?: string | null;
  difficulty?: string | null;
  estimatedHours?: string | null;
  deliverable?: string | null;
  skills?: string | null;
  verificationMethod?: string | null;
  checkpointPlan?: unknown;
  submissionRequirements?: unknown;
  targetRoleIds?: string[];
  competencyIds?: string[];
  portfolioSignalIds?: string[];
  requiredToolIds?: string[];
  accessRequirementIds?: string[];
  recommendedExperienceLevels?: string[];
  careerTaxonomyVersion?: string | null;
};

export type NormalizedCatalogReview = {
  decision: PilotCatalogDecision;
  relevance: number;
  feasibility: number;
  proofValue: number;
  readiness: number;
  sourceTruth: boolean;
  resourceAccess: boolean;
  safeScope: boolean;
  issueCodes: PilotCatalogRiskCode[];
  notes: string;
  confidence: number;
  scoreJustifications: Record<string, string>;
  noConflictConfirmed: true;
};

export function validatePilotCatalogProject(project: PilotCatalogProjectInput): PilotCatalogIssue[] {
  const issues: PilotCatalogIssue[] = [];
  if (project.status !== "PUBLISHED" || project.moderationStatus !== "APPROVED" || project.isStarter) {
    issues.push({
      severity: "ERROR",
      code: "PROJECT_NOT_PUBLISHABLE",
      message: "Pilot projects must be approved, published, and non-starter records.",
    });
  }
  for (const issue of validateProjectProvenance(project)) {
    issues.push({ severity: "ERROR", code: issue.code, message: issue.message });
  }
  if (!project.category?.trim()) issues.push({ severity: "ERROR", code: "CATEGORY_REQUIRED", message: "Add a project category." });
  if (!["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(project.difficulty ?? "")) {
    issues.push({ severity: "ERROR", code: "DIFFICULTY_REQUIRED", message: "Choose a supported difficulty." });
  }
  if (!project.deliverable?.trim())
    issues.push({ severity: "ERROR", code: "DELIVERABLE_REQUIRED", message: "Define an exact deliverable." });
  if (!project.skills?.trim())
    issues.push({ severity: "ERROR", code: "SKILLS_REQUIRED", message: "Define the skills the reviewer may confirm." });
  if (!project.verificationMethod?.trim())
    issues.push({ severity: "ERROR", code: "VERIFICATION_REQUIRED", message: "Define how evidence will be reviewed." });
  issues.push(
    ...validateCareerMapping(
      {
        targetRoleIds: project.targetRoleIds,
        competencyIds: project.competencyIds,
        portfolioSignalIds: project.portfolioSignalIds,
        requiredToolIds: project.requiredToolIds,
        accessRequirementIds: project.accessRequirementIds,
        recommendedExperienceLevels: project.recommendedExperienceLevels,
        careerTaxonomyVersion: project.careerTaxonomyVersion ?? undefined,
      },
      project.difficulty,
    ),
  );

  const requirements = normalizeSubmissionRequirements(project.submissionRequirements, project.deliverable);
  const roadmapIssues = validateCanonicalRoadmap(project.checkpointPlan, {
    projectId: project.id,
    requiredSubmissionKeys: requirements.items.filter((item) => item.required).map((item) => item.key),
  });
  for (const issue of roadmapIssues) {
    issues.push({ severity: "ERROR", code: issue.code, message: issue.message });
  }

  const duration = String(project.estimatedHours ?? "").toLowerCase();
  if (/semester|month|quarter|year/.test(duration)) {
    issues.push({ severity: "ERROR", code: "PILOT_DURATION_TOO_LONG", message: "Pilot projects must fit a bounded eight-week window." });
  }
  if (!duration.trim()) {
    issues.push({ severity: "ERROR", code: "ESTIMATE_REQUIRED", message: "Add a duration estimate." });
  }

  const practiceClaims = `${project.title} ${project.deliverable}`.toLowerCase();
  if (
    project.provenanceStatus === "PRACTICE" &&
    /owner letter|stakeholder letter|testimonial|signed engagement|real subscribers|winner certificate|merged pr|published extension/.test(
      practiceClaims,
    )
  ) {
    issues.push({
      severity: "ERROR",
      code: "UNVERIFIED_EXTERNAL_OUTCOME",
      message: "The practice brief requires an external outcome that Intrnd cannot guarantee.",
    });
  }
  if (project.provenanceStatus === "PRACTICE" && /local business|student org|real product|real brand/.test(project.title.toLowerCase())) {
    issues.push({
      severity: "WARNING",
      code: "SOURCE_CONTEXT_CHECK",
      message: "Confirm the brief clearly presents this as a practice scenario unless a real partner is linked.",
    });
  }
  return dedupeIssues(issues);
}

export function normalizeCatalogReview(input: unknown): { review: NormalizedCatalogReview | null; error?: string } {
  const body = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const decision = String(body.decision ?? "").toUpperCase() as PilotCatalogDecision;
  const scores = ["relevance", "feasibility", "proofValue", "readiness"].map((key) => Number(body[key]));
  const notes = typeof body.notes === "string" ? body.notes.trim() : "";
  const confidence = Number(body.confidence);
  const rawJustifications =
    body.scoreJustifications && typeof body.scoreJustifications === "object" && !Array.isArray(body.scoreJustifications)
      ? (body.scoreJustifications as Record<string, unknown>)
      : {};
  const scoreJustifications = Object.fromEntries(
    ["relevance", "feasibility", "proofValue", "readiness"].map((key) => [
      key,
      typeof rawJustifications[key] === "string" ? rawJustifications[key].trim() : "",
    ]),
  );
  const rawIssues = Array.isArray(body.issueCodes) ? body.issueCodes.map(String) : [];
  const issueCodes = [
    ...new Set(rawIssues.filter((code): code is PilotCatalogRiskCode => pilotCatalogRiskCodes.includes(code as PilotCatalogRiskCode))),
  ];
  if (!pilotCatalogDecisions.includes(decision)) return { review: null, error: "Choose approve, changes requested, or reject." };
  if (issueCodes.length !== new Set(rawIssues).size) return { review: null, error: "One or more review issue codes are unsupported." };
  if (scores.some((score) => !Number.isInteger(score) || score < 1 || score > 5))
    return { review: null, error: "Every rubric score must be an integer from 1 to 5." };
  if (!Number.isInteger(confidence) || confidence < 1 || confidence > 5)
    return { review: null, error: "Confidence must be an integer from 1 to 5." };
  if (body.noConflictConfirmed !== true)
    return { review: null, error: "Confirm that you have no undisclosed conflict before saving the review." };
  if (notes.length < 30 || notes.length > 2000) return { review: null, error: "Add a 30-2,000 character evidence-based review note." };
  for (const [index, key] of ["relevance", "feasibility", "proofValue", "readiness"].entries()) {
    const justification = scoreJustifications[key];
    if (scores[index] < 4 && (justification.length < 20 || justification.length > 500)) {
      return { review: null, error: `Add a 20-500 character justification for the ${key} score.` };
    }
    if (justification.length > 500) return { review: null, error: `${key} justification must be 500 characters or fewer.` };
  }
  const review: NormalizedCatalogReview = {
    decision,
    relevance: scores[0],
    feasibility: scores[1],
    proofValue: scores[2],
    readiness: scores[3],
    sourceTruth: body.sourceTruth === true,
    resourceAccess: body.resourceAccess === true,
    safeScope: body.safeScope === true,
    issueCodes,
    notes,
    confidence,
    scoreJustifications,
    noConflictConfirmed: true,
  };
  if (
    decision === "APPROVE" &&
    (scores.some((score) => score < 4) ||
      !review.sourceTruth ||
      !review.resourceAccess ||
      !review.safeScope ||
      review.issueCodes.length > 0 ||
      review.confidence < 4)
  ) {
    return { review: null, error: "Approval requires scores and confidence of 4 or 5, all three checks, and no unresolved issue codes." };
  }
  return { review };
}

export function pilotPublishReadiness(input: {
  projectIssues: PilotCatalogIssue[];
  projectFingerprint: string;
  reviews: Array<{
    reviewerId: string;
    decision: string;
    projectFingerprint: string;
    reviewType?: string;
    confidence?: number;
    conflictConfirmedAt?: Date | string | null;
    reviewerKind?: string;
  }>;
  assignments?: Array<{ reviewerId: string; reviewType: string; qualified?: boolean; reviewerKind?: string }>;
  riskCodes?: PilotCatalogRiskCode[];
}) {
  const blockingIssues = input.projectIssues.filter((issue) => issue.severity === "ERROR");
  const currentReviews = input.reviews.filter((review) => review.projectFingerprint === input.projectFingerprint);
  const staleReviews = input.reviews.length - currentReviews.length;
  const assignments = input.assignments ?? [];
  const humanReviewRequired = humanReviewRiskCodes(input.riskCodes ?? []).length > 0;
  const approvedReview = (review: (typeof currentReviews)[number], reviewType: "DOMAIN" | "CAREER") =>
    review.reviewType === reviewType &&
    review.decision === "APPROVE" &&
    (review.confidence ?? 0) >= 4 &&
    Boolean(review.conflictConfirmedAt);
  const aiDomainReview = currentReviews.find((review) => review.reviewerKind === "AI_AGENT" && approvedReview(review, "DOMAIN"));
  const aiCareerReview = currentReviews.find((review) => review.reviewerKind === "AI_AGENT" && approvedReview(review, "CAREER"));
  const aiDomainApproved = Boolean(aiDomainReview);
  const aiCareerApproved = Boolean(aiCareerReview);
  const humanDomainAssignment = assignments.find((assignment) => assignment.reviewType === "DOMAIN" && assignment.reviewerKind === "HUMAN");
  const humanCareerAssignment = assignments.find((assignment) => assignment.reviewType === "CAREER" && assignment.reviewerKind === "HUMAN");
  const humanApproved = (assignment: typeof humanDomainAssignment, reviewType: "DOMAIN" | "CAREER") =>
    Boolean(
      assignment &&
        currentReviews.some(
          (review) =>
            assignment.qualified !== false &&
            review.reviewerId === assignment.reviewerId &&
            review.reviewerKind === "HUMAN" &&
            approvedReview(review, reviewType),
        ),
    );
  const humanDomainApproved = humanApproved(humanDomainAssignment, "DOMAIN");
  const humanCareerApproved = humanApproved(humanCareerAssignment, "CAREER");
  const aiReviewerIds = new Set(currentReviews.filter((review) => review.reviewerKind === "AI_AGENT").map((review) => review.reviewerId));
  const requiredHumanReviewerIds = new Set(
    [humanDomainAssignment?.reviewerId, humanCareerAssignment?.reviewerId].filter((reviewerId): reviewerId is string =>
      Boolean(reviewerId),
    ),
  );
  const requestedChanges = currentReviews.filter(
    (review) => (aiReviewerIds.has(review.reviewerId) || requiredHumanReviewerIds.has(review.reviewerId)) && review.decision !== "APPROVE",
  ).length;
  const requiredCurrentApprovalMissing =
    !aiDomainApproved || !aiCareerApproved || (humanReviewRequired && (!humanDomainApproved || !humanCareerApproved));
  const reasons = [
    ...blockingIssues.map((issue) => issue.code),
    ...(staleReviews && requiredCurrentApprovalMissing ? ["PROJECT_CHANGED_SINCE_REVIEW"] : []),
    ...(!aiDomainApproved ? ["AI_DOMAIN_APPROVAL_REQUIRED"] : []),
    ...(!aiCareerApproved ? ["AI_CAREER_APPROVAL_REQUIRED"] : []),
    ...(aiDomainReview && aiCareerReview && aiDomainReview.reviewerId === aiCareerReview.reviewerId
      ? ["DISTINCT_AI_REVIEWERS_REQUIRED"]
      : []),
    ...(humanReviewRequired && !humanDomainAssignment ? ["DOMAIN_REVIEWER_UNASSIGNED"] : []),
    ...(humanReviewRequired && !humanCareerAssignment ? ["CAREER_REVIEWER_UNASSIGNED"] : []),
    ...(humanReviewRequired && humanDomainAssignment?.qualified === false ? ["DOMAIN_REVIEWER_NOT_QUALIFIED"] : []),
    ...(humanReviewRequired && humanCareerAssignment?.qualified === false ? ["CAREER_REVIEWER_NOT_QUALIFIED"] : []),
    ...(humanReviewRequired && humanDomainAssignment && !humanDomainApproved ? ["DOMAIN_HUMAN_APPROVAL_REQUIRED"] : []),
    ...(humanReviewRequired && humanCareerAssignment && !humanCareerApproved ? ["CAREER_HUMAN_APPROVAL_REQUIRED"] : []),
    ...(humanReviewRequired &&
    humanDomainAssignment &&
    humanCareerAssignment &&
    humanDomainAssignment.reviewerId === humanCareerAssignment.reviewerId
      ? ["DISTINCT_REVIEWERS_REQUIRED"]
      : []),
    ...(requestedChanges ? ["UNRESOLVED_REVIEW_DECISION"] : []),
  ];
  return {
    ready: reasons.length === 0,
    reasons: [...new Set(reasons)],
    approvingReviewers: Number(aiDomainApproved) + Number(aiCareerApproved),
    domainApproved: aiDomainApproved,
    careerApproved: aiCareerApproved,
    aiDomainApproved,
    aiCareerApproved,
    humanReviewRequired,
    humanDomainApproved,
    humanCareerApproved,
  };
}

export function pilotCatalogProjectFingerprint(project: PilotCatalogProjectInput) {
  const excluded = new Set([
    // Hash scalar fields, including organizationId, so query-specific relation includes do not change the fingerprint.
    "organization",
    "catalogReviewAssignments",
    "catalogReviews",
    "createdAt",
    "updatedAt",
    "pilotCatalogStatus",
    "pilotCatalogVersion",
    "pilotCatalogReason",
    "pilotCatalogRiskCodes",
    "pilotReviewedAt",
    "pilotReviewedBy",
    "pilotPublishedAt",
  ]);
  const content = Object.fromEntries(
    Object.entries(project as unknown as Record<string, unknown>)
      .filter(([key]) => !excluded.has(key))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  const manifestRiskCodes = pilotCatalogCandidate(project.id)?.riskCodes ?? [];
  return createHash("sha256")
    .update(JSON.stringify({ ...content, manifestRiskCodes }))
    .digest("hex");
}

function dedupeIssues(issues: PilotCatalogIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.severity}:${issue.code}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
