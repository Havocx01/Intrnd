import { randomUUID } from "node:crypto";
import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { scrapeAllActiveSources, scrapeAndExtractOpportunities } from "../scraping/extractor.js";
import { validateProjectProvenance } from "../projects/provenance.js";
import { getSubmissionStorage } from "../submissions/storage.js";
import { normalizeSubmissionRequirements } from "../submissions/requirements.js";
import { recordProductEvent } from "../telemetry/productEvents.js";
import { calculateCohortMetrics } from "../telemetry/cohortMetrics.js";
import { validateCanonicalRoadmap } from "../roadmaps/validation.js";
import type { CanonicalRoadmapPlan } from "../roadmaps/types.js";
import { estimateCatalogMinutes } from "../roadmaps/catalog.js";
import { env } from "../config/env.js";
import { PILOT_CATALOG_VERSION, PILOT_CATALOG_V1, pilotCatalogCandidate } from "../pilotCatalog/manifest.js";
import {
  normalizeCatalogReview,
  isCurrentQualifiedAssignment,
  pilotCatalogProjectFingerprint,
  pilotPublishReadiness,
  validatePilotCatalogProject,
} from "../pilotCatalog/validation.js";
import { careerTaxonomy, careerDomains, careerReviewerExpertise, roleDomainIds } from "../career/taxonomy.js";
import { normalizeCareerMapping, resolvedCareerMapping, validateCareerMapping } from "../career/mapping.js";
import { CatalogReviewError, saveAssignedCatalogReview } from "../pilotCatalog/reviewService.js";

const router = Router();

router.get("/access-requests", requireAdmin, async (_request, response) => {
  const requests = await prisma.pilotAccessRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { user: { select: { id: true, email: true, name: true, plan: true, cohortId: true } } },
  });
  response.json({ requests, pendingCount: requests.filter((item) => item.status === "PENDING").length });
});

router.post("/access-requests/:id/:decision", requireAdmin, async (request, response) => {
  const id = firstParam(request.params.id);
  const decisionParam = firstParam(request.params.decision).toUpperCase();
  const decision = decisionParam === "APPROVE" ? "APPROVED" : decisionParam === "REJECT" ? "REJECTED" : null;
  if (!decision) {
    response.status(400).json({ error: "Decision must be approve or reject." });
    return;
  }
  const note = normalizeOptionalString(request.body?.note);
  const existing = await prisma.pilotAccessRequest.findUnique({ where: { id } });
  if (!existing) {
    response.status(404).json({ error: "Access request not found." });
    return;
  }
  if (existing.status !== "PENDING") {
    response.status(409).json({ error: "This access request has already been decided.", code: "ACCESS_REQUEST_ALREADY_DECIDED" });
    return;
  }
  const actor = request.user!.id;
  const result = await prisma.$transaction(async (tx) => {
    const accessRequest = await tx.pilotAccessRequest.update({
      where: { id },
      data: { status: decision, decisionNote: note, reviewedBy: actor, reviewedAt: new Date() },
    });
    const user =
      decision === "APPROVED"
        ? await tx.user.update({ where: { id: existing.userId }, data: { plan: existing.requestedPlan } })
        : await tx.user.findUniqueOrThrow({ where: { id: existing.userId } });
    await tx.auditLog.create({
      data: {
        actor,
        action: decision === "APPROVED" ? "ACCESS_REQUEST_APPROVED" : "ACCESS_REQUEST_REJECTED",
        target: `pilotAccessRequest:${id}`,
        metadata: JSON.stringify({ userId: existing.userId, requestedPlan: existing.requestedPlan, note }),
      },
    });
    return { accessRequest, user };
  });
  if (decision === "APPROVED") {
    void recordProductEvent({ userId: existing.userId, eventType: "ACCESS_GRANTED", properties: { grantedPlan: existing.requestedPlan } });
  }
  response.json(result);
});

router.patch("/users/:userId/plan", requireAdmin, async (request, response) => {
  const userId = firstParam(request.params.userId);
  const plan = normalizePlan(request.body?.plan);
  const reason = normalizeOptionalString(request.body?.reason);
  if (!plan || !reason) {
    response.status(400).json({ error: "A valid plan and audit reason are required." });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true } });
  if (!existing) {
    response.status(404).json({ error: "User not found." });
    return;
  }
  const actor = request.user!.id;
  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: userId }, data: { plan } });
    await tx.auditLog.create({
      data: {
        actor,
        action: "USER_PLAN_CHANGED",
        target: `user:${userId}`,
        metadata: JSON.stringify({ from: existing.plan, to: plan, reason }),
      },
    });
    return updated;
  });
  void recordProductEvent({ userId, eventType: "ACCESS_GRANTED", properties: { grantedPlan: plan, source: "ADMIN_GRANT" } });
  response.json({ user });
});

router.get("/users", requireAdmin, async (request, response) => {
  const query = normalizeOptionalString(request.query.q)?.slice(0, 120);
  const users = await prisma.user.findMany({
    where: query
      ? { OR: [{ email: { contains: query, mode: "insensitive" } }, { name: { contains: query, mode: "insensitive" } }] }
      : undefined,
    orderBy: [{ createdAt: "desc" }, { email: "asc" }],
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      onboardingCompleted: true,
      cohortId: true,
      cohort: { select: { id: true, name: true } },
      createdAt: true,
      catalogReviewerProfile: true,
    },
  });
  response.json({ users });
});

router.get("/cohorts", requireAdmin, async (_request, response) => {
  const cohorts = await prisma.pilotCohort.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { users: true } } } });
  response.json({ cohorts });
});

router.post("/cohorts", requireAdmin, async (request, response) => {
  const name = normalizeOptionalString(request.body?.name)?.slice(0, 120);
  if (!name) {
    response.status(400).json({ error: "Cohort name is required." });
    return;
  }
  const cohort = await prisma.pilotCohort.create({
    data: {
      name,
      reviewSlaHours: 48,
      startsAt: normalizeOptionalDate(request.body?.startsAt),
      endsAt: normalizeOptionalDate(request.body?.endsAt),
    },
  });
  await writeAuditLog(request.user!.id, "PILOT_COHORT_CREATED", `cohort:${cohort.id}`, { name });
  response.status(201).json({ cohort });
});

router.patch("/cohorts/:cohortId/members/:userId", requireAdmin, async (request, response) => {
  const cohortId = firstParam(request.params.cohortId);
  const userId = firstParam(request.params.userId);
  const cohort = await prisma.pilotCohort.findUnique({ where: { id: cohortId } });
  if (!cohort) {
    response.status(404).json({ error: "Cohort not found." });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { cohortId: true, cohortJoinedAt: true } });
  if (!existing) {
    response.status(404).json({ error: "User not found." });
    return;
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { cohortId, cohortJoinedAt: existing.cohortId === cohortId && existing.cohortJoinedAt ? existing.cohortJoinedAt : new Date() },
  });
  await writeAuditLog(request.user!.id, "PILOT_COHORT_MEMBER_ADDED", `user:${userId}`, { cohortId });
  response.json({ user });
});

type AdminDelegate = {
  findMany: (args?: Record<string, unknown>) => Promise<unknown[]>;
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

const tableConfig: Record<
  string,
  { label: string; delegate: AdminDelegate; createDefaults: Record<string, unknown>; editableFields: readonly string[] }
> = {
  users: {
    label: "Users",
    delegate: prisma.user as unknown as AdminDelegate,
    createDefaults: { email: "", name: null, role: "STUDENT", accountType: "STUDENT", onboardingCompleted: false },
    editableFields: ["email", "name", "role", "accountType", "onboardingCompleted"] as const,
  },
  studentProfiles: {
    label: "Student Profiles",
    delegate: prisma.studentProfile as unknown as AdminDelegate,
    createDefaults: {
      userId: "",
      school: null,
      major: null,
      gradYear: null,
      careerInterests: null,
      skillsToBuild: null,
      projectPreferences: null,
    },
    editableFields: ["userId", "school", "major", "gradYear", "careerInterests", "skillsToBuild", "projectPreferences"] as const,
  },
  organizationProfiles: {
    label: "Organization Profiles",
    delegate: prisma.organizationProfile as unknown as AdminDelegate,
    createDefaults: { userId: "", organizationName: "", organizationType: null, roleTitle: null, helpTopics: null },
    editableFields: ["userId", "organizationName", "organizationType", "roleTitle", "helpTopics"] as const,
  },
  profileChangeRequests: {
    label: "Change Requests",
    delegate: prisma.profileChangeRequest as unknown as AdminDelegate,
    createDefaults: { userId: "", status: "PENDING", reason: null, decisionNote: null, reviewedBy: null },
    editableFields: ["userId", "status", "reason", "decisionNote", "reviewedBy"] as const,
  },
  projects: {
    label: "Projects",
    delegate: prisma.project as unknown as AdminDelegate,
    createDefaults: {
      title: "",
      description: "",
      organizationName: "",
      sourceType: "ORGANIZATION_POSTED",
      provenanceStatus: "PRACTICE",
      moderationStatus: "PENDING_REVIEW",
      schoolName: null,
      externalUrl: null,
      category: "",
      majorTags: "",
      interestTags: "",
      skillTags: "",
      estimatedHours: "",
      difficulty: "BEGINNER",
      deliverable: "",
      submissionRequirements: null,
      skills: "",
      verificationType: "ORGANIZATION_REVIEW",
      verificationMethod: "",
      status: "DRAFT",
      isStarter: false,
      createdById: "",
      organizationId: null,
    },
    editableFields: [
      "title",
      "description",
      "organizationName",
      "sourceType",
      "provenanceStatus",
      "schoolName",
      "externalUrl",
      "category",
      "majorTags",
      "interestTags",
      "skillTags",
      "estimatedHours",
      "difficulty",
      "deliverable",
      "submissionRequirements",
      "skills",
      "verificationType",
      "verificationMethod",
      "isStarter",
      "createdById",
      "organizationId",
    ] as const,
  },
  projectApplications: {
    label: "Project Applications",
    delegate: prisma.projectApplication as unknown as AdminDelegate,
    createDefaults: {
      userId: "",
      projectId: "",
      status: "ACTIVE",
      reviewerName: null,
      reviewerType: null,
      reviewNotes: null,
      resumeBullet: null,
      portfolioSummary: null,
    },
    editableFields: [
      "userId",
      "projectId",
      "status",
      "reviewerName",
      "reviewerType",
      "reviewNotes",
      "resumeBullet",
      "portfolioSummary",
    ] as const,
  },
  savedProjects: {
    label: "Saved Projects",
    delegate: prisma.savedProject as unknown as AdminDelegate,
    createDefaults: { userId: "", projectId: "" },
    editableFields: ["userId", "projectId"] as const,
  },
  submissions: {
    label: "Submissions",
    delegate: prisma.submission as unknown as AdminDelegate,
    createDefaults: { applicationId: "", deliverableUrl: "", notes: "", status: "SUBMITTED" },
    editableFields: ["applicationId", "deliverableUrl", "notes", "status"] as const,
  },
  subscriptions: {
    label: "Subscriptions",
    delegate: prisma.subscription as unknown as AdminDelegate,
    createDefaults: { userId: null, plan: "FREE", status: "INACTIVE", notes: null },
    editableFields: ["userId", "plan", "status", "notes"] as const,
  },
  auditLogs: {
    label: "Audit Logs",
    delegate: prisma.auditLog as unknown as AdminDelegate,
    createDefaults: { actor: "", action: "", target: "", metadata: "" },
    editableFields: ["actor", "action", "target", "metadata"] as const,
  },
  waitlistEntries: {
    label: "Waitlist Entries",
    delegate: prisma.waitlistEntry as unknown as AdminDelegate,
    createDefaults: { email: "", name: "", audience: "STUDENT", notes: "" },
    editableFields: ["email", "name", "audience", "notes"] as const,
  },
};

type TableName = keyof typeof tableConfig;

router.get("/overview", requireAdmin, async (_request, response) => {
  const [activeSubscriptions, users, projects, pendingSubmissions, waitlistEntries, subscriptions, recentActivity] = await Promise.all([
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.user.count(),
    prisma.project.count(),
    prisma.submission.count({ where: { status: "SUBMITTED" } }),
    prisma.waitlistEntry.count(),
    prisma.subscription.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  response.json({
    cards: { activeSubscriptions, users, projects, payments: 0, reports: pendingSubmissions, waitlistEntries },
    subscriptions,
    recentActivity,
  });
});

router.get("/cohorts/:cohortId/metrics", requireAdmin, async (request, response) => {
  const cohortId = firstParam(request.params.cohortId);
  const cohort = await prisma.pilotCohort.findUnique({ where: { id: cohortId } });
  if (!cohort) {
    response.status(404).json({ error: "Cohort not found." });
    return;
  }
  const [members, events, submissions] = await Promise.all([
    prisma.user.findMany({ where: { cohortId }, select: { id: true, cohortJoinedAt: true } }),
    prisma.productEvent.findMany({ where: { cohortId }, orderBy: { occurredAt: "asc" } }),
    prisma.submission.findMany({
      where: { application: { user: { cohortId } }, status: { in: ["VERIFIED", "NEEDS_REVISION"] } },
      select: { id: true, submittedAt: true, reviewedBy: true, reviewerName: true },
    }),
  ]);
  const metrics = calculateCohortMetrics({
    members,
    events,
    reviewedSubmissions: submissions.map((submission) => ({
      id: submission.id,
      submittedAt: submission.submittedAt,
      reviewedBy: submission.reviewedBy,
      reviewerName: submission.reviewerName,
    })),
    reviewSlaHours: cohort.reviewSlaHours,
  });
  response.json({
    cohort: {
      id: cohort.id,
      name: cohort.name,
      reviewSlaHours: cohort.reviewSlaHours,
      memberCount: members.length,
      startsAt: cohort.startsAt,
      endsAt: cohort.endsAt,
    },
    ...metrics,
  });
});

router.get("/submissions", requireAdmin, async (_request, response) => {
  const submissions = await prisma.submission.findMany({
    where: { status: "SUBMITTED", application: { status: "SUBMITTED" } },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    include: {
      items: true,
      application: {
        include: {
          user: { select: { id: true, email: true, name: true } },
          project: { select: { id: true, title: true, organizationName: true, deliverable: true, verificationMethod: true, skills: true } },
        },
      },
    },
  });

  response.json({
    submissions: submissions.map((submission) => ({
      id: submission.id,
      status: submission.status,
      deliverableUrl: submission.deliverableUrl,
      notes: submission.notes,
      items: submission.items.map((item) => ({
        id: item.id,
        requirementKey: item.requirementKey,
        kind: item.kind,
        textValue: item.textValue,
        url: item.url,
        originalFileName: item.originalFileName,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        downloadUrl: item.storageKey ? `/api/admin/submissions/${submission.id}/items/${item.id}/download` : null,
      })),
      createdAt: submission.createdAt,
      submittedAt: submission.submittedAt,
      student: submission.application.user,
      project: submission.application.project,
      applicationId: submission.applicationId,
    })),
  });
});

router.put("/projects/:projectId/submission-requirements", requireAdmin, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { deliverable: true, status: true, estimatedHours: true, checkpointPlan: true },
  });
  if (!project) {
    response.status(404).json({ error: "Project not found." });
    return;
  }
  const submissionRequirements = normalizeSubmissionRequirements(request.body, project.deliverable);
  if (project.status === "PUBLISHED") {
    const issues = validateCanonicalRoadmap(project.checkpointPlan, {
      projectId,
      requiredSubmissionKeys: submissionRequirements.items.filter((item) => item.required).map((item) => item.key),
      catalogEstimatedMinutes: estimateCatalogMinutes(project.estimatedHours),
    });
    if (issues.length) {
      response
        .status(409)
        .json({
          error: "Update the roadmap before changing requirements on a published project.",
          code: "PUBLISHED_PROJECT_ROADMAP_MISMATCH",
          issues,
        });
      return;
    }
  }
  const actor = request.user!.id;
  const updated = await prisma.$transaction(async (transaction) => {
    const saved = await transaction.project.update({ where: { id: projectId }, data: { submissionRequirements } });
    await transaction.auditLog.create({
      data: {
        actor,
        action: "SUBMISSION_REQUIREMENTS_UPDATED",
        target: `project:${projectId}`,
        metadata: JSON.stringify({ requirementCount: submissionRequirements.items.length }),
      },
    });
    return saved;
  });
  response.json({ project: updated, submissionRequirements });
});

router.get("/roadmaps", requireAdmin, async (_request, response) => {
  const projects = await prisma.project.findMany({
    where: { status: "PUBLISHED", moderationStatus: "APPROVED" },
    select: {
      id: true,
      title: true,
      category: true,
      estimatedHours: true,
      deliverable: true,
      submissionRequirements: true,
      checkpointPlan: true,
      checkpointPlanVersion: true,
      targetRoleIds: true,
      competencyIds: true,
      portfolioSignalIds: true,
      requiredToolIds: true,
      accessRequirementIds: true,
      recommendedExperienceLevels: true,
      careerTaxonomyVersion: true,
      careerMappingVersion: true,
      pilotCatalogStatus: true,
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  const rows = projects.map((project) => {
    const requirements = normalizeSubmissionRequirements(project.submissionRequirements, project.deliverable);
    const issues = validateCanonicalRoadmap(project.checkpointPlan, {
      projectId: project.id,
      requiredSubmissionKeys: requirements.items.filter((item) => item.required).map((item) => item.key),
      catalogEstimatedMinutes: estimateCatalogMinutes(project.estimatedHours),
    });
    return {
      id: project.id,
      title: project.title,
      category: project.category,
      version: project.checkpointPlanVersion,
      checkpointCount:
        project.checkpointPlan && typeof project.checkpointPlan === "object" && !Array.isArray(project.checkpointPlan)
          ? Array.isArray((project.checkpointPlan as Record<string, unknown>).checkpoints)
            ? ((project.checkpointPlan as Record<string, unknown>).checkpoints as unknown[]).length
            : 0
          : 0,
      valid: issues.length === 0,
      issues,
      careerMappingVersion: project.careerMappingVersion,
      careerMapping: resolvedCareerMapping(project),
      careerMappingIssues: validateCareerMapping(project, null),
      pilotCatalogStatus: project.pilotCatalogStatus,
    };
  });
  response.json({
    coverage: { total: rows.length, valid: rows.filter((row) => row.valid).length, invalid: rows.filter((row) => !row.valid).length },
    roadmaps: rows,
  });
});

router.get("/career-taxonomy", requireAdmin, async (_request, response) => {
  response.json(careerTaxonomy);
});

router.put("/catalog-reviewers/:userId", requireAdmin, async (request, response) => {
  const userId = firstParam(request.params.userId);
  const reviewerTypes = normalizeStringArray(request.body?.reviewerTypes).filter((value) => ["DOMAIN", "CAREER"].includes(value));
  const domainExpertiseIds = normalizeStringArray(request.body?.domainExpertiseIds);
  const careerExpertiseIds = normalizeStringArray(request.body?.careerExpertiseIds);
  const active = request.body?.active !== false;
  const knownDomains = new Set(careerDomains.map((entry) => entry.id));
  const knownCareerExpertise = new Set(careerReviewerExpertise.map((entry) => entry.id));
  if (reviewerTypes.length !== normalizeStringArray(request.body?.reviewerTypes).length) {
    response.status(400).json({ error: "Reviewer types must be DOMAIN or CAREER.", code: "REVIEWER_PROFILE_INVALID" });
    return;
  }
  if (domainExpertiseIds.some((id) => !knownDomains.has(id)) || careerExpertiseIds.some((id) => !knownCareerExpertise.has(id))) {
    response.status(400).json({ error: "Reviewer expertise contains an unknown taxonomy ID.", code: "REVIEWER_PROFILE_INVALID" });
    return;
  }
  if (
    active &&
    (!reviewerTypes.length ||
      (reviewerTypes.includes("DOMAIN") && !domainExpertiseIds.length) ||
      (reviewerTypes.includes("CAREER") && !careerExpertiseIds.length))
  ) {
    response
      .status(400)
      .json({
        error: "Active reviewers need at least one permitted type and expertise for every selected type.",
        code: "REVIEWER_PROFILE_INCOMPLETE",
      });
    return;
  }
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!target) {
    response.status(404).json({ error: "User not found.", code: "USER_NOT_FOUND" });
    return;
  }
  if (target.role === "ORGANIZATION" && active) {
    response.status(409).json({ error: "Organization accounts cannot be promoted to catalog reviewers.", code: "REVIEWER_ROLE_CONFLICT" });
    return;
  }
  const actor = request.user!.id;
  const result = await prisma.$transaction(async (transaction) => {
    const profile = await transaction.catalogReviewerProfile.upsert({
      where: { userId },
      create: { userId, reviewerTypes, domainExpertiseIds, careerExpertiseIds, active, configuredBy: actor },
      update: { reviewerTypes, domainExpertiseIds, careerExpertiseIds, active, configuredBy: actor },
    });
    const nextRole = target.role === "ADMIN" ? "ADMIN" : active ? "REVIEWER" : target.role === "REVIEWER" ? "STUDENT" : target.role;
    const user = await transaction.user.update({
      where: { id: userId },
      data: { role: nextRole },
      select: { id: true, email: true, name: true, role: true },
    });
    const affected = await transaction.projectCatalogReviewAssignment.findMany({
      where: { reviewerId: userId },
      select: { projectId: true },
    });
    await transaction.project.updateMany({
      where: { id: { in: affected.map((entry) => entry.projectId) }, pilotCatalogStatus: "PILOT_READY" },
      data: { pilotCatalogStatus: "CANDIDATE", pilotReviewedAt: null, pilotReviewedBy: null, pilotPublishedAt: null },
    });
    await transaction.auditLog.create({
      data: {
        actor,
        action: "CATALOG_REVIEWER_PROFILE_UPDATED",
        target: `user:${userId}`,
        metadata: JSON.stringify({ reviewerTypes, domainExpertiseIds, careerExpertiseIds, active }),
      },
    });
    return { profile, user };
  });
  response.json(result);
});

router.put("/pilot-catalog/:projectId/career-mapping", requireAdmin, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const expectedVersion = Number(request.body?.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    response.status(400).json({ error: "expectedVersion must be a non-negative integer.", code: "CAREER_MAPPING_VERSION_REQUIRED" });
    return;
  }
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.pilotCatalogStatus === "NOT_CANDIDATE") {
    response.status(404).json({ error: "Pilot catalog candidate not found.", code: "PILOT_CANDIDATE_NOT_FOUND" });
    return;
  }
  if (project.careerMappingVersion !== expectedVersion) {
    response
      .status(409)
      .json({
        error: "The career mapping changed since it was opened.",
        code: "CAREER_MAPPING_STALE",
        currentVersion: project.careerMappingVersion,
      });
    return;
  }
  const normalized = normalizeCareerMapping(request.body);
  const issues = normalized.mapping ? validateCareerMapping(normalized.mapping, project.difficulty) : [];
  const blocking = issues.find((issue) => issue.severity === "ERROR");
  if (!normalized.mapping || blocking) {
    response
      .status(400)
      .json({ error: blocking?.message ?? normalized.error ?? "Invalid career mapping.", code: "CAREER_MAPPING_INVALID", issues });
    return;
  }
  const actor = request.user!.id;
  try {
    const updated = await prisma.$transaction(
      async (transaction) => {
        const write = await transaction.project.updateMany({
          where: { id: projectId, careerMappingVersion: expectedVersion },
          data: {
            ...normalized.mapping!,
            careerMappingVersion: { increment: 1 },
            pilotCatalogStatus: project.pilotCatalogStatus === "PILOT_READY" ? "CANDIDATE" : project.pilotCatalogStatus,
            pilotReviewedAt: null,
            pilotReviewedBy: null,
            pilotPublishedAt: null,
          },
        });
        if (write.count !== 1) throw new PilotCatalogConflict("CAREER_MAPPING_STALE", "The career mapping changed since it was opened.");
        const saved = await transaction.project.findUniqueOrThrow({ where: { id: projectId } });
        await transaction.auditLog.create({
          data: {
            actor,
            action: "PROJECT_CAREER_MAPPING_UPDATED",
            target: `project:${projectId}`,
            metadata: JSON.stringify({
              oldVersion: expectedVersion,
              newVersion: saved.careerMappingVersion,
              taxonomyVersion: saved.careerTaxonomyVersion,
            }),
          },
        });
        return saved;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    response.json({
      project: updated,
      mapping: resolvedCareerMapping(updated),
      issues: validateCareerMapping(updated, updated.difficulty),
    });
  } catch (error) {
    if (error instanceof PilotCatalogConflict) {
      response.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    throw error;
  }
});

router.put("/pilot-catalog/:projectId/assignments/:reviewType", requireAdmin, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const reviewType = firstParam(request.params.reviewType).toUpperCase();
  const reviewerId = normalizeOptionalString(request.body?.reviewerId);
  if (!reviewerId || !["DOMAIN", "CAREER"].includes(reviewType)) {
    response.status(400).json({ error: "Choose a reviewer and DOMAIN or CAREER assignment type.", code: "REVIEW_ASSIGNMENT_INVALID" });
    return;
  }
  const [project, profile, otherAssignment] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, include: { organization: { select: { userId: true } } } }),
    prisma.catalogReviewerProfile.findUnique({ where: { userId: reviewerId }, include: { user: { select: { role: true } } } }),
    prisma.projectCatalogReviewAssignment.findFirst({
      where: { projectId, catalogVersion: PILOT_CATALOG_VERSION, reviewType: reviewType === "DOMAIN" ? "CAREER" : "DOMAIN" },
    }),
  ]);
  if (!project || project.pilotCatalogStatus === "NOT_CANDIDATE") {
    response.status(404).json({ error: "Pilot catalog candidate not found.", code: "PILOT_CANDIDATE_NOT_FOUND" });
    return;
  }
  if (!profile?.active || !profile.reviewerTypes.includes(reviewType) || !["ADMIN", "REVIEWER"].includes(profile.user.role)) {
    response
      .status(409)
      .json({ error: "The selected account is not active and qualified for this review type.", code: "REVIEWER_NOT_QUALIFIED" });
    return;
  }
  if (otherAssignment?.reviewerId === reviewerId) {
    response.status(409).json({ error: "Domain and career reviews require different people.", code: "DISTINCT_REVIEWERS_REQUIRED" });
    return;
  }
  if (project.createdById === reviewerId || project.organization?.userId === reviewerId) {
    response
      .status(409)
      .json({
        error: "The project creator or linked organization owner cannot be assigned as reviewer.",
        code: "CATALOG_REVIEWER_CONFLICT",
      });
    return;
  }
  if (reviewType === "DOMAIN" && !roleDomainIds(project.targetRoleIds).some((domainId) => profile.domainExpertiseIds.includes(domainId))) {
    response
      .status(409)
      .json({ error: "Reviewer domain expertise must overlap the project's target roles.", code: "DOMAIN_EXPERTISE_MISMATCH" });
    return;
  }
  if (reviewType === "CAREER" && !profile.careerExpertiseIds.length) {
    response.status(409).json({ error: "Career-review expertise is required.", code: "CAREER_EXPERTISE_REQUIRED" });
    return;
  }
  const actor = request.user!.id;
  const result = await prisma.$transaction(async (transaction) => {
    const assignment = await transaction.projectCatalogReviewAssignment.upsert({
      where: { projectId_catalogVersion_reviewType: { projectId, catalogVersion: PILOT_CATALOG_VERSION, reviewType } },
      create: { projectId, catalogVersion: PILOT_CATALOG_VERSION, reviewType, reviewerId, assignedBy: actor },
      update: { reviewerId, assignedBy: actor },
      include: { reviewer: { select: { id: true, name: true, email: true } } },
    });
    await transaction.project.updateMany({
      where: { id: projectId, pilotCatalogStatus: "PILOT_READY" },
      data: { pilotCatalogStatus: "CANDIDATE", pilotReviewedAt: null, pilotReviewedBy: null, pilotPublishedAt: null },
    });
    await transaction.auditLog.create({
      data: {
        actor,
        action: "CATALOG_REVIEWER_ASSIGNED",
        target: `project:${projectId}`,
        metadata: JSON.stringify({ reviewType, reviewerId }),
      },
    });
    return assignment;
  });
  response.json({ assignment: result });
});

router.delete("/pilot-catalog/:projectId/assignments/:reviewType", requireAdmin, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const reviewType = firstParam(request.params.reviewType).toUpperCase();
  if (!["DOMAIN", "CAREER"].includes(reviewType)) {
    response.status(400).json({ error: "Review type must be DOMAIN or CAREER.", code: "REVIEW_ASSIGNMENT_INVALID" });
    return;
  }
  const actor = request.user!.id;
  await prisma.$transaction(async (transaction) => {
    await transaction.projectCatalogReviewAssignment.deleteMany({
      where: { projectId, catalogVersion: PILOT_CATALOG_VERSION, reviewType },
    });
    await transaction.project.updateMany({
      where: { id: projectId, pilotCatalogStatus: "PILOT_READY" },
      data: { pilotCatalogStatus: "CANDIDATE", pilotReviewedAt: null, pilotReviewedBy: null, pilotPublishedAt: null },
    });
    await transaction.auditLog.create({
      data: { actor, action: "CATALOG_REVIEWER_UNASSIGNED", target: `project:${projectId}`, metadata: JSON.stringify({ reviewType }) },
    });
  });
  response.status(204).end();
});

router.get("/pilot-catalog", requireAdmin, async (request, response) => {
  const projectIds = PILOT_CATALOG_V1.map((candidate) => candidate.projectId);
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    include: {
      catalogReviews: {
        where: { catalogVersion: PILOT_CATALOG_VERSION },
        include: { reviewer: { select: { id: true, name: true, email: true } } },
        orderBy: { updatedAt: "desc" },
      },
      catalogReviewAssignments: {
        where: { catalogVersion: PILOT_CATALOG_VERSION },
        include: { reviewer: { select: { id: true, name: true, email: true, role: true, catalogReviewerProfile: true } } },
        orderBy: { reviewType: "asc" },
      },
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
  const qualifiedReviewers = await prisma.catalogReviewerProfile.findMany({
    where: { active: true, user: { role: { in: ["ADMIN", "REVIEWER"] } } },
    include: { user: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { user: { email: "asc" } },
  });
  const rows = projects.map((project) => {
    const issues = validatePilotCatalogProject(project);
    const projectFingerprint = pilotCatalogProjectFingerprint(project);
    const readinessAssignments = project.catalogReviewAssignments.map((assignment) => ({
      ...assignment,
      qualified: isCurrentQualifiedAssignment(project.targetRoleIds, assignment),
      reviewerKind: assignment.reviewer.catalogReviewerProfile?.reviewerKind,
    }));
    const publishReadiness = pilotPublishReadiness({
      projectIssues: issues,
      projectFingerprint,
      reviews: project.catalogReviews,
      assignments: readinessAssignments,
      riskCodes: pilotCatalogCandidate(project.id)?.riskCodes,
    });
    return {
      id: project.id,
      title: project.title,
      description: project.description,
      organizationName: project.organizationName,
      sourceType: project.sourceType,
      externalUrl: project.externalUrl,
      category: project.category,
      difficulty: project.difficulty,
      estimatedHours: project.estimatedHours,
      deliverable: project.deliverable,
      skills: project.skills,
      verificationMethod: project.verificationMethod,
      provenanceStatus: project.provenanceStatus,
      roadmapReview: catalogRoadmapReview(project.checkpointPlan),
      pilotCatalogStatus: project.pilotCatalogStatus,
      pilotCatalogVersion: project.pilotCatalogVersion,
      pilotCatalogReason: project.pilotCatalogReason,
      pilotPublishedAt: project.pilotPublishedAt,
      pilotCatalogRiskCodes: normalizeJsonStringArray(project.pilotCatalogRiskCodes),
      projectFingerprint,
      careerMappingVersion: project.careerMappingVersion,
      careerMapping: {
        targetRoleIds: project.targetRoleIds,
        competencyIds: project.competencyIds,
        portfolioSignalIds: project.portfolioSignalIds,
        requiredToolIds: project.requiredToolIds,
        accessRequirementIds: project.accessRequirementIds,
        recommendedExperienceLevels: project.recommendedExperienceLevels,
        careerTaxonomyVersion: project.careerTaxonomyVersion,
      },
      resolvedCareerMapping: resolvedCareerMapping(project),
      careerMappingIssues: validateCareerMapping(project, project.difficulty),
      catalogReviewAssignments: project.catalogReviewAssignments,
      catalogReviews: project.catalogReviews.map((review) => ({ ...review, issueCodes: normalizeJsonStringArray(review.issueCodes) })),
      issues,
      publishReadiness,
    };
  });
  const syncedIds = new Set(rows.map((project) => project.id));
  const missingProjectIds = projectIds.filter((projectId) => !syncedIds.has(projectId));
  response.json({
    catalogVersion: PILOT_CATALOG_VERSION,
    currentReviewerId: request.user!.id,
    mode: env.pilotCatalogMode,
    minimumReady: env.pilotMinimumReady,
    taxonomy: careerTaxonomy,
    qualifiedReviewers,
    summary: {
      manifestCandidates: projectIds.length,
      syncedCandidates: rows.length,
      ready: rows.filter((project) => project.pilotCatalogStatus === "PILOT_READY").length,
      onHold: rows.filter((project) => project.pilotCatalogStatus === "HOLD").length,
      needsSecondReview: rows.filter((project) => project.publishReadiness.approvingReviewers === 1).length,
      mappingIncomplete: rows.filter((project) => project.careerMappingIssues.some((issue) => issue.severity === "ERROR")).length,
      domainUnassigned: rows.filter((project) => project.publishReadiness.reasons.includes("DOMAIN_REVIEWER_UNASSIGNED")).length,
      careerUnassigned: rows.filter((project) => project.publishReadiness.reasons.includes("CAREER_REVIEWER_UNASSIGNED")).length,
      structurallyBlocked: rows.filter((project) => project.issues.some((issue) => issue.severity === "ERROR")).length,
      publishableNow: rows.filter((project) => project.publishReadiness.ready && project.pilotCatalogStatus !== "PILOT_READY").length,
    },
    missingProjectIds,
    projects: rows,
  });
});

router.put("/pilot-catalog/:projectId/review", requireAdmin, async (request, response) => {
  try {
    const result = await saveAssignedCatalogReview({
      projectId: firstParam(request.params.projectId),
      reviewerId: request.user!.id,
      body: request.body,
    });
    response.json(result);
  } catch (error) {
    if (error instanceof CatalogReviewError) {
      response.status(error.status).json({ error: error.message, code: error.code, ...error.details });
      return;
    }
    throw error;
  }
});

router.post("/pilot-catalog/:projectId/publish", requireAdmin, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const actor = request.user!.id;
  const finalReviewNotes = normalizeOptionalString(request.body?.finalReviewNotes);
  const expectedProjectFingerprint = normalizeOptionalString(request.body?.projectFingerprint);
  if (!finalReviewNotes || finalReviewNotes.length < 30 || finalReviewNotes.length > 2000) {
    response
      .status(400)
      .json({ error: "Add a 30-2,000 character human final-review note before publishing.", code: "FINAL_REVIEW_NOTES_REQUIRED" });
    return;
  }
  if (!expectedProjectFingerprint) {
    response
      .status(400)
      .json({ error: "The current project fingerprint is required for final review.", code: "FINAL_REVIEW_FINGERPRINT_REQUIRED" });
    return;
  }
  try {
    const result = await prisma.$transaction(
      async (transaction) => {
        const [project, actorProfile] = await Promise.all([
          transaction.project.findUnique({
            where: { id: projectId },
            include: {
              catalogReviews: { where: { catalogVersion: PILOT_CATALOG_VERSION } },
              catalogReviewAssignments: {
                where: { catalogVersion: PILOT_CATALOG_VERSION },
                include: { reviewer: { select: { role: true, catalogReviewerProfile: true } } },
              },
            },
          }),
          transaction.catalogReviewerProfile.findUnique({ where: { userId: actor }, select: { reviewerKind: true } }),
        ]);
        if (actorProfile?.reviewerKind === "AI_AGENT") {
          throw new PilotCatalogConflict(
            "HUMAN_FINAL_REVIEW_REQUIRED",
            "An AI reviewer account cannot perform the final review or publish a project.",
            403,
          );
        }
        if (!project || project.pilotCatalogVersion !== PILOT_CATALOG_VERSION || project.pilotCatalogStatus === "NOT_CANDIDATE") {
          throw new PilotCatalogConflict("PILOT_CANDIDATE_NOT_FOUND", "Pilot catalog candidate not found.", 404);
        }
        if (project.pilotCatalogStatus === "PILOT_READY") {
          throw new PilotCatalogConflict("PILOT_PROJECT_ALREADY_PUBLISHED", "This project is already pilot-ready.");
        }
        const issues = validatePilotCatalogProject(project);
        const projectFingerprint = pilotCatalogProjectFingerprint(project);
        if (expectedProjectFingerprint !== projectFingerprint) {
          throw new PilotCatalogConflict(
            "FINAL_REVIEW_FINGERPRINT_MISMATCH",
            "This project changed after the final review screen loaded. Review the current version before publishing.",
            409,
            { expectedProjectFingerprint, currentProjectFingerprint: projectFingerprint },
          );
        }
        const readinessAssignments = project.catalogReviewAssignments.map((assignment) => ({
          ...assignment,
          qualified: isCurrentQualifiedAssignment(project.targetRoleIds, assignment),
          reviewerKind: assignment.reviewer.catalogReviewerProfile?.reviewerKind,
        }));
        const readiness = pilotPublishReadiness({
          projectIssues: issues,
          projectFingerprint,
          reviews: project.catalogReviews,
          assignments: readinessAssignments,
          riskCodes: pilotCatalogCandidate(project.id)?.riskCodes,
        });
        if (!readiness.ready) {
          throw new PilotCatalogConflict(
            "PILOT_CATALOG_NOT_READY",
            "Two current AI pre-approvals, any required specialist human approvals, and clean structural validation are required before final human review.",
            409,
            { issues, reasons: readiness.reasons },
          );
        }
        const now = new Date();
        const updated = await transaction.project.update({
          where: { id: projectId },
          data: { pilotCatalogStatus: "PILOT_READY", pilotReviewedAt: now, pilotReviewedBy: actor, pilotPublishedAt: now },
        });
        await transaction.auditLog.create({
          data: {
            actor,
            action: "PILOT_CATALOG_PUBLISHED",
            target: `project:${projectId}`,
            metadata: JSON.stringify({
              catalogVersion: PILOT_CATALOG_VERSION,
              projectFingerprint,
              aiApprovingReviewers: readiness.approvingReviewers,
              humanFinalReview: true,
              finalReviewNotes,
            }),
          },
        });
        return { project: updated, readiness };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    response.json(result);
  } catch (error) {
    if (error instanceof PilotCatalogConflict) {
      response.status(error.status).json({ error: error.message, code: error.code, ...error.details });
      return;
    }
    throw error;
  }
});

router.post("/pilot-catalog/:projectId/hold", requireAdmin, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const reason = normalizeOptionalString(request.body?.reason);
  if (!reason || reason.length < 20) {
    response
      .status(400)
      .json({ error: "Add at least 20 characters explaining why the project is on hold.", code: "PILOT_HOLD_REASON_REQUIRED" });
    return;
  }
  const actor = request.user!.id;
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const project = await transaction.project.findFirst({
        where: { id: projectId, pilotCatalogVersion: PILOT_CATALOG_VERSION, pilotCatalogStatus: { not: "NOT_CANDIDATE" } },
      });
      if (!project) throw new PilotCatalogConflict("PILOT_CANDIDATE_NOT_FOUND", "Pilot catalog candidate not found.", 404);
      const updated = await transaction.project.update({ where: { id: projectId }, data: { pilotCatalogStatus: "HOLD" } });
      await transaction.auditLog.create({
        data: {
          actor,
          action: "PILOT_CATALOG_HELD",
          target: `project:${projectId}`,
          metadata: JSON.stringify({ catalogVersion: PILOT_CATALOG_VERSION, reason }),
        },
      });
      return updated;
    });
    response.json({ project: result });
  } catch (error) {
    if (error instanceof PilotCatalogConflict) {
      response.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    throw error;
  }
});

router.get("/projects/:projectId/checkpoint-plan", requireAdmin, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      category: true,
      deliverable: true,
      submissionRequirements: true,
      checkpointPlan: true,
      checkpointPlanVersion: true,
    },
  });
  if (!project) {
    response.status(404).json({ error: "Project not found." });
    return;
  }
  const versions = await prisma.projectRoadmapVersion.findMany({
    where: { projectId },
    orderBy: { version: "desc" },
    select: { version: true, publishedBy: true, createdAt: true },
  });
  response.json({ project, versions });
});

router.put("/projects/:projectId/checkpoint-plan", requireAdmin, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const existing = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, title: true, estimatedHours: true, deliverable: true, submissionRequirements: true, checkpointPlanVersion: true },
  });
  if (!existing) {
    response.status(404).json({ error: "Project not found." });
    return;
  }
  if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
    response.status(400).json({ error: "Checkpoint plan is required." });
    return;
  }
  const nextVersion = existing.checkpointPlanVersion + 1;
  const candidate = {
    ...(request.body as Record<string, unknown>),
    schemaVersion: 1,
    projectId,
    projectTitle: existing.title,
    version: nextVersion,
    authoredBy: normalizeOptionalString(request.body.authoredBy) ?? request.user!.id,
    reviewedBy: normalizeOptionalString(request.body.reviewedBy),
  } as unknown as CanonicalRoadmapPlan;
  const requirements = normalizeSubmissionRequirements(existing.submissionRequirements, existing.deliverable);
  const issues = validateCanonicalRoadmap(candidate, {
    projectId,
    requiredSubmissionKeys: requirements.items.filter((item) => item.required).map((item) => item.key),
    catalogEstimatedMinutes: estimateCatalogMinutes(existing.estimatedHours),
  });
  if (issues.length) {
    response.status(400).json({ error: "Checkpoint plan validation failed.", code: "ROADMAP_VALIDATION_FAILED", issues });
    return;
  }
  const actor = request.user!.id;
  const result = await prisma.$transaction(async (transaction) => {
    const project = await transaction.project.update({
      where: { id: projectId },
      data: { checkpointPlan: candidate as unknown as Prisma.InputJsonValue, checkpointPlanVersion: nextVersion },
    });
    const version = await transaction.projectRoadmapVersion.create({
      data: { projectId, version: nextVersion, plan: candidate as unknown as Prisma.InputJsonValue, publishedBy: actor },
    });
    await transaction.auditLog.create({
      data: {
        actor,
        action: "PROJECT_ROADMAP_PUBLISHED",
        target: `project:${projectId}`,
        metadata: JSON.stringify({ fromVersion: existing.checkpointPlanVersion, toVersion: nextVersion, reviewedBy: candidate.reviewedBy }),
      },
    });
    return { project, version };
  });
  response.json({ ...result, checkpointPlan: candidate });
});

router.get("/submissions/:submissionId/items/:itemId/download", requireAdmin, async (request, response) => {
  const submissionId = firstParam(request.params.submissionId);
  const itemId = firstParam(request.params.itemId);
  const item = await prisma.submissionItem.findFirst({ where: { id: itemId, submissionId } });
  if (!item?.storageKey || !item.originalFileName || !item.mimeType) {
    response.status(404).json({ error: "Attachment not found." });
    return;
  }
  const result = await getSubmissionStorage().download(item.storageKey, item.originalFileName, item.mimeType);
  if (result.url) {
    response.redirect(302, result.url);
    return;
  }
  response.setHeader("Content-Type", item.mimeType);
  response.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(item.originalFileName)}`);
  response.send(result.buffer);
});

router.post("/submissions/:id/review", requireAdmin, async (request, response) => {
  const submissionId = firstParam(request.params.id);
  const decision = String(request.body?.decision ?? "").toUpperCase();

  if (!["VERIFIED", "NEEDS_REVISION"].includes(decision)) {
    response.status(400).json({ error: "Decision must be VERIFIED or NEEDS_REVISION." });
    return;
  }

  const reviewNotes = normalizeOptionalString(request.body?.reviewNotes);
  const resumeBullet = normalizeOptionalString(request.body?.resumeBullet);
  const portfolioSummary = normalizeOptionalString(request.body?.portfolioSummary);
  const verifiedSkills = splitTags(normalizeOptionalString(request.body?.verifiedSkills));

  if (!reviewNotes || reviewNotes.length < 20) {
    response
      .status(400)
      .json({
        error: "Add at least 20 characters explaining what the evidence shows or what needs revision.",
        code: "REVIEW_NOTES_REQUIRED",
      });
    return;
  }
  if (
    decision === "VERIFIED" &&
    (!resumeBullet || resumeBullet.length < 30 || !portfolioSummary || portfolioSummary.length < 60 || verifiedSkills.length === 0)
  ) {
    response
      .status(400)
      .json({
        error:
          "Verification requires confirmed skills, a reviewed resume bullet, and a portfolio summary grounded in the submitted evidence.",
        code: "PROOF_METADATA_REQUIRED",
      });
    return;
  }

  const actor = request.user!.id;
  const reviewer = await prisma.user.findUnique({ where: { id: actor }, select: { name: true, email: true } });
  if (!reviewer) {
    response.status(401).json({ error: "Reviewer account not found." });
    return;
  }
  const reviewerName = reviewer.name?.trim() || reviewer.email;
  const reviewerType = "Intrnd review";
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const target = await tx.submission.findUnique({
          where: { id: submissionId },
          include: { application: { include: { project: true } } },
        });
        if (!target) throw new ReviewConflict("SUBMISSION_NOT_FOUND", "Submission not found.", 404);
        const allowedSkills = new Map(
          splitTags(target.application.project.skills).map((skill) => [skill.toLocaleLowerCase("en-US"), skill]),
        );
        const canonicalVerifiedSkills = verifiedSkills.flatMap((skill) => {
          const canonical = allowedSkills.get(skill.toLocaleLowerCase("en-US"));
          return canonical ? [canonical] : [];
        });
        if (decision === "VERIFIED" && canonicalVerifiedSkills.length !== verifiedSkills.length) {
          throw new ReviewConflict(
            "VERIFIED_SKILLS_INVALID",
            "Confirmed skills must come from the project’s reviewed skill criteria.",
            400,
          );
        }
        if (target.status !== "SUBMITTED" || target.application.status !== "SUBMITTED") {
          throw new ReviewConflict("INVALID_REVIEW_STATE", "Only a pending submission can be reviewed.");
        }
        const latest = await tx.submission.findFirst({
          where: { applicationId: target.applicationId, status: { not: "DRAFT" } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { id: true },
        });
        if (latest?.id !== submissionId) {
          throw new ReviewConflict("STALE_SUBMISSION", "A newer submission must be reviewed instead.");
        }
        const reviewedAt = new Date();
        const reviewedWrite = await tx.submission.updateMany({
          where: { id: submissionId, status: "SUBMITTED" },
          data: {
            status: decision,
            submittedAt: target.submittedAt ?? target.createdAt,
            reviewedAt,
            reviewedBy: actor,
            reviewerName,
            reviewerType,
            reviewNotes,
            resumeBullet: decision === "VERIFIED" ? resumeBullet : null,
            portfolioSummary: decision === "VERIFIED" ? portfolioSummary : null,
            verifiedSkills: decision === "VERIFIED" ? canonicalVerifiedSkills.join(", ") : null,
          },
        });
        if (reviewedWrite.count !== 1) {
          throw new ReviewConflict("REVIEW_ALREADY_CLAIMED", "Another reviewer already decided this submission.");
        }
        const applicationWrite = await tx.projectApplication.updateMany({
          where: { id: target.applicationId, status: "SUBMITTED" },
          data: {
            status: decision,
            reviewedAt,
            reviewerName,
            reviewerType,
            reviewNotes,
            resumeBullet: decision === "VERIFIED" ? resumeBullet : null,
            portfolioSummary: decision === "VERIFIED" ? portfolioSummary : null,
          },
        });
        if (applicationWrite.count !== 1) {
          throw new ReviewConflict("REVIEW_ALREADY_CLAIMED", "Another reviewer already decided this application.");
        }
        const [reviewed, application] = await Promise.all([
          tx.submission.findUniqueOrThrow({ where: { id: submissionId } }),
          tx.projectApplication.findUniqueOrThrow({ where: { id: target.applicationId } }),
        ]);
        await tx.auditLog.create({
          data: {
            actor,
            action: "SUBMISSION_REVIEW",
            target: `submission:${submissionId}`,
            metadata: JSON.stringify({
              decision,
              applicationId: target.applicationId,
              reviewerId: actor,
              reviewerName,
              reviewerType,
              verifiedSkills: canonicalVerifiedSkills,
            }),
          },
        });
        return { submission: reviewed, application, userId: target.application.userId, projectId: target.application.projectId };
      },
      { isolationLevel: "Serializable" },
    );
    await recordProductEvent({
      userId: result.userId,
      eventType: "REVIEW_COMPLETED",
      projectId: result.projectId,
      applicationId: result.application.id,
      submissionId: result.submission.id,
      properties: { decision, reviewerId: actor },
      dedupeScope: result.submission.id,
    });
    response.json({ submission: result.submission, application: result.application });
  } catch (error) {
    if (error instanceof ReviewConflict) {
      response.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    if (isPrismaWriteConflict(error)) {
      response
        .status(409)
        .json({
          error: "The submission changed while it was being reviewed. Refresh the queue and try again.",
          code: "REVIEW_WRITE_CONFLICT",
        });
      return;
    }
    throw error;
  }
});

router.get("/projects/pending", requireAdmin, async (_request, response) => {
  const projects = await prisma.project.findMany({
    where: { moderationStatus: "PENDING_REVIEW" },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, email: true, name: true, role: true } }, organization: true },
  });

  response.json({ projects });
});

router.post("/projects/:id/approve", requireAdmin, async (request, response) => {
  const projectId = firstParam(request.params.id);
  const candidate = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      title: true,
      estimatedHours: true,
      deliverable: true,
      submissionRequirements: true,
      checkpointPlan: true,
      checkpointPlanVersion: true,
      provenanceStatus: true,
      organizationId: true,
      externalUrl: true,
      scrapedAt: true,
      lastSeenAt: true,
      sourceType: true,
    },
  });
  if (!candidate) {
    response.status(404).json({ error: "Project not found." });
    return;
  }
  const requirements = normalizeSubmissionRequirements(candidate.submissionRequirements, candidate.deliverable);
  const roadmapIssues = validateCanonicalRoadmap(candidate.checkpointPlan, {
    projectId,
    requiredSubmissionKeys: requirements.items.filter((item) => item.required).map((item) => item.key),
    catalogEstimatedMinutes: estimateCatalogMinutes(candidate.estimatedHours),
  });
  const provenanceIssues = validateProjectProvenance(candidate);
  if (roadmapIssues.length || provenanceIssues.length) {
    response
      .status(409)
      .json({
        error: "This project is not ready to publish.",
        code: "PROJECT_PUBLISHING_REQUIREMENTS_INCOMPLETE",
        issues: [...provenanceIssues, ...roadmapIssues],
      });
    return;
  }
  const actor = request.user!.id;
  const project = await prisma.$transaction(async (transaction) => {
    const published = await transaction.project.update({
      where: { id: projectId },
      data: { moderationStatus: "APPROVED", status: "PUBLISHED", updatedAt: new Date() },
    });
    await transaction.auditLog.create({
      data: {
        actor,
        action: "PROJECT_APPROVE",
        target: `project:${projectId}`,
        metadata: JSON.stringify({
          title: candidate.title,
          sourceType: candidate.sourceType,
          provenanceStatus: candidate.provenanceStatus,
          checkpointPlanVersion: candidate.checkpointPlanVersion,
        }),
      },
    });
    return published;
  });
  response.json({ project });
});

router.post("/projects/:id/reject", requireAdmin, async (request, response) => {
  const projectId = firstParam(request.params.id);
  const reason = typeof request.body?.reason === "string" ? request.body.reason.trim() : "";
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { moderationStatus: "REJECTED", status: "DRAFT", updatedAt: new Date() },
  });

  void writeAuditLog("admin", "PROJECT_REJECT", `project:${projectId}`, {
    title: project.title,
    sourceType: project.sourceType,
    reason: reason || null,
  });

  response.json({ project });
});

router.get("/database", requireAdmin, async (_request, response) => {
  const tables = await Promise.all(
    Object.entries(tableConfig).map(async ([name, config]) => ({
      name,
      label: config.label,
      readOnly: isReadOnlyAdminTable(name),
      editableFields: config.editableFields,
      createDefaults: config.createDefaults,
      rows: sanitizeRows(await config.delegate.findMany({ orderBy: { createdAt: "desc" } })),
    })),
  );

  response.json({ tables });
});

router.get("/onboarding", requireAdmin, async (_request, response) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { studentProfile: true, organizationProfile: true },
  });

  response.json({
    records: users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      accountType: user.accountType,
      onboardingCompleted: user.onboardingCompleted,
      school: user.studentProfile?.school ?? null,
      major: user.studentProfile?.major ?? null,
      gradYear: user.studentProfile?.gradYear ?? null,
      careerInterests: user.studentProfile?.careerInterests ?? null,
      skillsToBuild: user.studentProfile?.skillsToBuild ?? null,
      projectPreferences: user.studentProfile?.projectPreferences ?? null,
      organizationName: user.organizationProfile?.organizationName ?? null,
      organizationType: user.organizationProfile?.organizationType ?? null,
      roleTitle: user.organizationProfile?.roleTitle ?? null,
      helpTopics: user.organizationProfile?.helpTopics ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
  });
});

router.get("/onboarding-requests", requireAdmin, async (_request, response) => {
  const requests = await prisma.profileChangeRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, email: true, name: true, accountType: true, profileEditsUsed: true, profileEditsAllowed: true } },
    },
  });

  const statusRank: Record<string, number> = { PENDING: 0, APPROVED: 1, REJECTED: 1 };
  const sorted = [...requests].sort((a, b) => (statusRank[a.status] ?? 2) - (statusRank[b.status] ?? 2));

  response.json({
    requests: sorted.map((entry) => ({
      id: entry.id,
      status: entry.status,
      reason: entry.reason,
      decisionNote: entry.decisionNote,
      reviewedBy: entry.reviewedBy,
      reviewedAt: entry.reviewedAt,
      createdAt: entry.createdAt,
      user: entry.user,
    })),
    pendingCount: requests.filter((entry) => entry.status === "PENDING").length,
  });
});

router.post("/onboarding-requests/:id/approve", requireAdmin, async (request, response) => {
  await decideChangeRequest(request, response, "APPROVED");
});

router.post("/onboarding-requests/:id/reject", requireAdmin, async (request, response) => {
  await decideChangeRequest(request, response, "REJECTED");
});

router.post("/database/:table", requireAdmin, async (request, response) => {
  const tableName = firstParam(request.params.table);
  if (isReadOnlyAdminTable(tableName)) {
    response.status(403).json({ error: "Use the dedicated audited workflow to change this table.", code: "ADMIN_TABLE_READ_ONLY" });
    return;
  }
  const table = getTable(tableName);

  if (!table) {
    response.status(404).json({ error: "Unknown table." });
    return;
  }

  try {
    const data = pickEditableData(table.editableFields, request.body?.data ?? {});
    const createData = await getCreateData(tableName, data);
    const created = await table.delegate.create({ data: { id: randomUUID(), ...createData, ...updatedAtData(tableName) } });

    void writeAuditLog("admin", "DATABASE_CREATE", `${tableName}:${String((created as { id?: unknown }).id ?? "")}`, data);
    response.status(201).json({ row: sanitizeRow(created) });
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Unable to create row." });
  }
});

router.patch("/database/:table/:id", requireAdmin, async (request, response) => {
  const tableName = firstParam(request.params.table);
  if (isReadOnlyAdminTable(tableName)) {
    response.status(403).json({ error: "Use the dedicated audited workflow to change this table.", code: "ADMIN_TABLE_READ_ONLY" });
    return;
  }
  const table = getTable(tableName);

  if (!table) {
    response.status(404).json({ error: "Unknown table." });
    return;
  }

  const data = pickEditableData(table.editableFields, request.body?.data ?? {});
  const updated = await table.delegate.update({
    where: { id: firstParam(request.params.id) },
    data: { ...data, ...updatedAtData(firstParam(request.params.table)) },
  });

  void writeAuditLog("admin", "DATABASE_UPDATE", `${firstParam(request.params.table)}:${firstParam(request.params.id)}`, data);
  response.json({ row: sanitizeRow(updated) });
});

router.delete("/database/:table/:id", requireAdmin, async (request, response) => {
  const tableName = firstParam(request.params.table);
  if (isReadOnlyAdminTable(tableName)) {
    response.status(403).json({ error: "This table is read-only in the database explorer.", code: "ADMIN_TABLE_READ_ONLY" });
    return;
  }
  const table = getTable(tableName);

  if (!table) {
    response.status(404).json({ error: "Unknown table." });
    return;
  }

  await table.delegate.delete({ where: { id: firstParam(request.params.id) } });

  void writeAuditLog("admin", "DATABASE_DELETE", `${firstParam(request.params.table)}:${firstParam(request.params.id)}`);
  response.status(204).send();
});

function getTable(tableName: string) {
  return tableConfig[tableName as TableName];
}

function isReadOnlyAdminTable(tableName: string) {
  return ["users", "projects", "projectApplications", "submissions", "subscriptions", "auditLogs"].includes(tableName);
}

function firstParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function pickEditableData(fields: readonly string[], source: Record<string, unknown>) {
  return fields.reduce<Record<string, unknown>>((data, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      data[field] = source[field] === "" ? null : source[field];
    }

    return data;
  }, {});
}

async function getCreateData(tableName: string, data: Record<string, unknown>) {
  if (tableName === "users") {
    return {
      email: typeof data.email === "string" && data.email ? data.email : placeholderEmail(),
      name: data.name ?? "Admin Created User",
      role: data.role ?? "STUDENT",
      accountType: data.accountType ?? "STUDENT",
      onboardingCompleted: data.onboardingCompleted ?? false,
      passwordHash: "admin-created-no-login",
    };
  }

  if (tableName === "studentProfiles") {
    return { ...data, userId: typeof data.userId === "string" && data.userId ? data.userId : await createPlaceholderUser() };
  }

  if (tableName === "organizationProfiles") {
    return {
      ...data,
      userId: typeof data.userId === "string" && data.userId ? data.userId : await createPlaceholderUser(),
      organizationName:
        typeof data.organizationName === "string" && data.organizationName ? data.organizationName : "Admin Created Organization",
    };
  }

  if (tableName === "projects") {
    return {
      ...data,
      title: typeof data.title === "string" && data.title ? data.title : "Admin Created Project",
      description: typeof data.description === "string" && data.description ? data.description : "Created from the admin database editor.",
      sourceType: data.sourceType ?? "ORGANIZATION_POSTED",
      moderationStatus: data.moderationStatus ?? "PENDING_REVIEW",
      schoolName: data.schoolName ?? null,
      externalUrl: data.externalUrl ?? null,
      status: data.status ?? "DRAFT",
      organizationName: data.organizationName ?? null,
      category: data.category ?? null,
      majorTags: data.majorTags ?? null,
      interestTags: data.interestTags ?? null,
      skillTags: data.skillTags ?? data.skills ?? null,
      estimatedHours: data.estimatedHours ?? null,
      difficulty: data.difficulty ?? "BEGINNER",
      deliverable: data.deliverable ?? null,
      skills: data.skills ?? null,
      verificationType: data.verificationType ?? "ORGANIZATION_REVIEW",
      verificationMethod: data.verificationMethod ?? null,
      isStarter: data.isStarter ?? false,
      createdById: typeof data.createdById === "string" && data.createdById ? data.createdById : await createPlaceholderUser(),
    };
  }

  if (tableName === "projectApplications") {
    return {
      userId: typeof data.userId === "string" && data.userId ? data.userId : await createPlaceholderUser(),
      projectId: data.projectId,
      status: data.status ?? "ACTIVE",
      reviewerName: data.reviewerName ?? null,
      reviewerType: data.reviewerType ?? null,
      reviewNotes: data.reviewNotes ?? null,
      resumeBullet: data.resumeBullet ?? null,
      portfolioSummary: data.portfolioSummary ?? null,
    };
  }

  if (tableName === "savedProjects") {
    return {
      userId: typeof data.userId === "string" && data.userId ? data.userId : await createPlaceholderUser(),
      projectId: data.projectId,
    };
  }

  if (tableName === "submissions") {
    return {
      applicationId: data.applicationId,
      deliverableUrl: data.deliverableUrl ?? null,
      notes: data.notes ?? null,
      status: data.status ?? "SUBMITTED",
    };
  }

  if (tableName === "subscriptions") {
    return { userId: data.userId ?? null, plan: data.plan ?? "FREE", status: data.status ?? "INACTIVE", notes: data.notes ?? null };
  }

  if (tableName === "auditLogs") {
    return {
      actor: data.actor ?? "admin",
      action: data.action ?? "MANUAL_LOG",
      target: data.target ?? null,
      metadata: typeof data.metadata === "string" ? data.metadata : JSON.stringify(data.metadata ?? {}),
    };
  }

  if (tableName === "waitlistEntries") {
    return { email: data.email, name: data.name ?? null, audience: data.audience ?? null, notes: data.notes ?? null };
  }

  return data;
}

function updatedAtData(tableName: string) {
  return ["auditLogs", "savedProjects"].includes(tableName) ? {} : { updatedAt: new Date() };
}

async function decideChangeRequest(
  request: import("express").Request,
  response: import("express").Response,
  decision: "APPROVED" | "REJECTED",
) {
  const id = firstParam(request.params.id);
  const note = normalizeOptionalString(request.body?.note);

  const existing = await prisma.profileChangeRequest.findUnique({ where: { id } });

  if (!existing) {
    response.status(404).json({ error: "Change request not found." });
    return;
  }

  if (existing.status !== "PENDING") {
    response.status(400).json({ error: "This request has already been reviewed." });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const changeRequest = await tx.profileChangeRequest.update({
      where: { id },
      data: { status: decision, decisionNote: note, reviewedBy: "admin", reviewedAt: new Date() },
    });

    if (decision === "APPROVED") {
      await tx.user.update({ where: { id: existing.userId }, data: { profileEditsAllowed: { increment: 1 } } });
    }

    return changeRequest;
  });

  void writeAuditLog("admin", decision === "APPROVED" ? "CHANGE_REQUEST_APPROVE" : "CHANGE_REQUEST_REJECT", `profileChangeRequest:${id}`, {
    userId: existing.userId,
    note: note ?? null,
  });

  response.json({ request: updated });
}

async function writeAuditLog(actor: string, action: string, target?: string, metadata?: unknown) {
  try {
    await prisma.auditLog.create({ data: { actor, action, target, metadata: metadata === undefined ? null : JSON.stringify(metadata) } });
  } catch {
    // Audit logging must not block the admin action.
  }
}

async function createPlaceholderUser() {
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: placeholderEmail(),
      name: "Admin Created User",
      passwordHash: "admin-created-no-login",
      role: "STUDENT",
      updatedAt: new Date(),
    },
    select: { id: true },
  });

  return user.id;
}

function placeholderEmail() {
  return `admin-created-${Date.now()}-${Math.floor(Math.random() * 10000)}@example.invalid`;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizePlan(value: unknown): "FREE" | "PRO" | "PRO_PLUS" | null {
  const plan = typeof value === "string" ? value.trim().toUpperCase() : "";
  return plan === "FREE" || plan === "PRO" || plan === "PRO_PLUS" ? plan : null;
}

function normalizeOptionalDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

class PilotCatalogConflict extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 409,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

function normalizeJsonStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function catalogRoadmapReview(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { checkpoints: [] };
  const checkpoints = Array.isArray((value as Record<string, unknown>).checkpoints)
    ? ((value as Record<string, unknown>).checkpoints as Array<Record<string, unknown>>)
    : [];
  return {
    checkpoints: checkpoints.map((checkpoint) => {
      const resources =
        checkpoint.resourcesBySupport && typeof checkpoint.resourcesBySupport === "object" && !Array.isArray(checkpoint.resourcesBySupport)
          ? Object.values(checkpoint.resourcesBySupport as Record<string, unknown>).flatMap((items) => (Array.isArray(items) ? items : []))
          : [];
      const uniqueResources = new Map<string, { label: string; url: string }>();
      for (const resource of resources) {
        if (!resource || typeof resource !== "object" || Array.isArray(resource)) continue;
        const label =
          typeof (resource as Record<string, unknown>).label === "string"
            ? String((resource as Record<string, unknown>).label)
            : "Resource";
        const url = typeof (resource as Record<string, unknown>).url === "string" ? String((resource as Record<string, unknown>).url) : "";
        if (url) uniqueResources.set(url, { label, url });
      }
      return {
        id: String(checkpoint.id ?? ""),
        title: String(checkpoint.title ?? "Untitled checkpoint"),
        requiredOutput: String(checkpoint.requiredOutput ?? ""),
        completionMode: String(checkpoint.completionMode ?? ""),
        resources: [...uniqueResources.values()],
      };
    }),
  };
}

class ReviewConflict extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}

function isPrismaWriteConflict(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2034");
}

function splitTags(value: string | null) {
  return value
    ? value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
}

router.post("/scrape/all", requireAdmin, async (_request, response) => {
  try {
    const result = await scrapeAllActiveSources();
    await prisma.auditLog.create({ data: { actor: "admin", action: "SCRAPE_ALL", metadata: JSON.stringify(result) } });
    response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scraping failed";
    response.status(500).json({ error: message });
  }
});

router.post("/scrape/:sourceId", requireAdmin, async (request, response) => {
  const sourceId = Array.isArray(request.params.sourceId) ? request.params.sourceId[0] : request.params.sourceId;

  try {
    const result = await scrapeAndExtractOpportunities(sourceId);
    await prisma.auditLog.create({
      data: {
        actor: "admin",
        action: "SCRAPE_SOURCE",
        target: sourceId,
        metadata: JSON.stringify({ opportunities: result.opportunities.length, projectsCreated: result.projectsCreated }),
      },
    });
    response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scraping failed";
    response.status(500).json({ error: message });
  }
});

router.post("/scrape/sources", requireAdmin, async (request, response) => {
  const { schoolName, sourceName, url, sourceType } = request.body ?? {};

  if (!schoolName || !sourceName || !url) {
    response.status(400).json({ error: "schoolName, sourceName, and url are required." });
    return;
  }

  const source = await prisma.universityOpportunitySource.create({
    data: { schoolName, sourceName, url, sourceType: sourceType ?? "UNIVERSITY_PAGE", status: "ACTIVE" },
  });

  response.status(201).json({ source });
});

router.get("/scrape/sources", requireAdmin, async (_request, response) => {
  const sources = await prisma.universityOpportunitySource.findMany({ orderBy: { createdAt: "desc" } });
  response.json({ sources });
});

function sanitizeRows(rows: unknown[]) {
  return rows.map(sanitizeRow);
}

function sanitizeRow(row: unknown) {
  if (!row || typeof row !== "object") {
    return row;
  }

  const safeRow = { ...(row as Record<string, unknown>) };

  if ("passwordHash" in safeRow) {
    safeRow.passwordHash = "[hidden]";
  }

  return safeRow;
}

function normalizeStringArray(value: unknown): string[] {
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

export default router;
