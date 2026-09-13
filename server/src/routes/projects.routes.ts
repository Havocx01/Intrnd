import { Router } from "express";
import multer from "multer";
import { Prisma } from "@prisma/client";
import { ensureV3ProjectCatalog } from "../catalog/v3ProjectCatalog.js";
import { prisma } from "../db/prisma.js";
import { sanitizeLockedProject } from "../lib/lockedProjects.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { submissionUploadRateLimit } from "../middleware/rateLimit.js";
import { MAX_SUBMISSION_FILE_BYTES, MAX_SUBMISSION_FILES, validateUpload } from "../submissions/fileValidation.js";
import { inferSubmissionRequirements, isHttpsUrl, isRepositoryUrl, normalizeSubmissionRequirements } from "../submissions/requirements.js";
import { getSubmissionStorage } from "../submissions/storage.js";
import type { SubmissionEvidenceKind } from "../submissions/types.js";
import { cleanupAbandonedSubmissionDrafts } from "../submissions/cleanupDrafts.js";
import { applyTransition, canEditSubmission, transitionError } from "../projects/applicationLifecycle.js";
import { canStartProject } from "../projects/entitlements.js";
import { recordProductEvent, saveProductEvent } from "../telemetry/productEvents.js";
import { rankCatalogProjectsWithRules } from "../ranking/rankingService.js";
import {
  emptyCheckpointProgress,
  checkpointCompletionError,
  normalizeCheckpointProgress,
  normalizeRoadmapPreferences,
  parseRoadmapSnapshot,
  personalizeRoadmap,
  personalizeRoadmapFromContext,
  roadmapContextFromSnapshot,
} from "../roadmaps/roadmapService.js";
import { buildProfileFeatures } from "../personalization/profileFeatureService.js";
import { parseCanonicalRoadmap } from "../roadmaps/validation.js";
import type { CheckpointProgress, RoadmapSnapshot } from "../roadmaps/types.js";
import { sourceVerification } from "../projects/projectPresentation.js";
import { env } from "../config/env.js";
import { pilotCatalogProjectWhere } from "../pilotCatalog/eligibility.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: MAX_SUBMISSION_FILE_BYTES } });

const allowedSourceTypes = [
  "INTRND_CREATED",
  "AI_GENERATED",
  "UNIVERSITY",
  "THIRD_PARTY",
  "STUDENT_SUBMITTED",
  "ORGANIZATION_POSTED",
  "BETA_EXAMPLE",
] as const;

const allowedDifficulties = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
const allowedOpportunityTypes = ["PROJECT", "COMPETITION", "COURSE", "JOB", "RESEARCH", "LAB", "CLUB", "OTHER"] as const;
const allowedLocationTypes = ["REMOTE", "ON_CAMPUS", "HYBRID", "LOCAL", "ONLINE"] as const;

// Public discovery returns teasers; entitled briefs come from /recommendations or /me.
router.get("/", async (_request, response) => {
  await ensureV3ProjectCatalog();

  const projects = await prisma.project.findMany({
    where: projectCatalogWhere(),
    orderBy: [{ rankScore: "desc" }, { updatedAt: "desc" }],
    select: projectSelect,
  });

  response.json({ projects: projects.map((project) => sanitizeLockedProject(formatProject(project))) });
});

router.get("/me", requireAuth, async (request, response) => {
  const [loadedApplications, studentProfile] = await Promise.all([
    prisma.projectApplication.findMany({
      where: { userId: request.user!.id, status: { not: "WITHDRAWN" } },
      orderBy: { updatedAt: "desc" },
      include: {
        project: { select: projectSelect },
        submissions: { where: { status: { not: "DRAFT" } }, orderBy: { createdAt: "desc" }, include: { items: true } },
      },
    }),
    prisma.studentProfile.findUnique({ where: { userId: request.user!.id } }),
  ]);

  const applications = await Promise.all(
    loadedApplications.map(async (application) => {
      const legacySnapshot = parseRoadmapSnapshot(application.roadmapSnapshot);
      if (!legacySnapshot || legacySnapshot.schemaVersion !== 1) return application;
      const version = await prisma.projectRoadmapVersion.findUnique({
        where: { projectId_version: { projectId: application.projectId, version: legacySnapshot.canonicalPlanVersion } },
      });
      const requirements = normalizeSubmissionRequirements(application.project.submissionRequirements, application.project.deliverable);
      const parsed = parseCanonicalRoadmap(version?.plan, {
        projectId: application.projectId,
        requiredSubmissionKeys: requiredRequirementKeys(requirements),
      });
      if (!parsed.plan) return application;
      const upgradedSnapshot = personalizeRoadmapFromContext(
        parsed.plan,
        legacySnapshot.preferences,
        roadmapContextFromSnapshot(legacySnapshot),
      );
      const checkpointProgress = normalizeCheckpointProgress(application.checkpointProgress, upgradedSnapshot);
      await prisma.projectApplication.update({
        where: { id: application.id },
        data: {
          roadmapSnapshot: upgradedSnapshot as unknown as Prisma.InputJsonValue,
          checkpointProgress: checkpointProgress as unknown as Prisma.InputJsonValue,
        },
      });
      return { ...application, roadmapSnapshot: upgradedSnapshot, checkpointProgress };
    }),
  );

  const ranking = rankCatalogProjectsWithRules(
    studentProfile,
    applications.map((application) => application.project),
  );
  const personalizationByProjectId = new Map(ranking.rankedProjects.map((ranked) => [ranked.projectId, ranked]));

  response.json({
    applications: applications.map((application) => {
      const personalization = personalizationByProjectId.get(application.projectId);
      return {
        id: application.id,
        status: application.status,
        roadmapPreferences: application.roadmapPreferences,
        roadmapSnapshot: application.roadmapSnapshot,
        checkpointProgress: application.checkpointProgress,
        reviewedAt: application.reviewedAt,
        reviewerName: application.reviewerName,
        reviewerType: application.reviewerType,
        reviewNotes: application.reviewNotes,
        resumeBullet: application.resumeBullet,
        portfolioSummary: application.portfolioSummary,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt,
        project: formatProject(application.project, {
          studentProfile,
          saved: false,
          applicationStatus: application.status,
          matchBand: personalization?.matchBand,
          recommendationReason: personalization?.reason,
          matchDetails: personalization?.matchDetails,
        }),
        submissions: application.submissions.map((submission) => serializeSubmission(submission)),
      };
    }),
  });
});

router.patch("/:projectId/roadmap-preferences", requireAuth, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const application = await prisma.projectApplication.findUnique({
    where: { userId_projectId: { userId: request.user!.id, projectId } },
    include: { project: { select: { deliverable: true, submissionRequirements: true } } },
  });
  if (!application) {
    response.status(404).json({ error: "Project application not found." });
    return;
  }
  if (!canEditSubmission(application.status)) {
    response.status(409).json(transitionError("ROADMAP_LOCKED", "Roadmap preferences cannot be changed in this application state."));
    return;
  }
  const preferences = normalizeRoadmapPreferences(request.body);
  if (!preferences) {
    response.status(400).json({ error: "Choose 1-40 weekly hours and a valid support level." });
    return;
  }
  const currentSnapshot = parseRoadmapSnapshot(application.roadmapSnapshot);
  if (!currentSnapshot) {
    response.status(409).json(transitionError("ROADMAP_UNAVAILABLE", "This application does not have a valid roadmap."));
    return;
  }
  const version = await prisma.projectRoadmapVersion.findUnique({
    where: { projectId_version: { projectId, version: currentSnapshot.canonicalPlanVersion } },
  });
  const requirements = normalizeSubmissionRequirements(application.project.submissionRequirements, application.project.deliverable);
  const parsed = parseCanonicalRoadmap(version?.plan, { projectId, requiredSubmissionKeys: requiredRequirementKeys(requirements) });
  if (!parsed.plan) {
    response.status(409).json(transitionError("ROADMAP_UNAVAILABLE", "The original roadmap version is unavailable."));
    return;
  }
  const snapshot = personalizeRoadmapFromContext(
    parsed.plan,
    preferences,
    roadmapContextFromSnapshot(currentSnapshot),
    currentSnapshot.schemaVersion === 2 ? currentSnapshot.profileFeatureHash : undefined,
  );
  const progress = normalizeCheckpointProgress(application.checkpointProgress, snapshot);
  await prisma.projectApplication.update({
    where: { id: application.id },
    data: {
      roadmapPreferences: preferences as unknown as Prisma.InputJsonValue,
      roadmapSnapshot: snapshot as unknown as Prisma.InputJsonValue,
      checkpointProgress: progress as unknown as Prisma.InputJsonValue,
    },
  });
  await recordProductEvent({
    userId: request.user!.id,
    eventType: "ROADMAP_CONFIGURED",
    projectId,
    applicationId: application.id,
    properties: { weeklyHours: preferences.weeklyHours, supportLevel: preferences.supportLevel, source: "PREFERENCE_UPDATE" },
    dedupeScope: `${application.id}:${preferences.supportLevel}:${preferences.weeklyHours}`,
  });
  response.json({ roadmapPreferences: preferences, roadmapSnapshot: snapshot, checkpointProgress: progress });
});

router.patch("/:projectId/checkpoints/:checkpointId", requireAuth, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const checkpointId = firstParam(request.params.checkpointId);
  const application = await prisma.projectApplication.findUnique({
    where: { userId_projectId: { userId: request.user!.id, projectId } },
    include: {
      project: { select: { deliverable: true, submissionRequirements: true } },
      submissions: { where: { status: "DRAFT" }, include: { items: true } },
    },
  });
  if (!application) {
    response.status(404).json({ error: "Project application not found." });
    return;
  }
  if (!canEditSubmission(application.status)) {
    response.status(409).json(transitionError("ROADMAP_LOCKED", "Checkpoints cannot be changed in this application state."));
    return;
  }
  const snapshot = parseRoadmapSnapshot(application.roadmapSnapshot);
  if (!snapshot) {
    response.status(409).json(transitionError("ROADMAP_UNAVAILABLE", "This application does not have a valid roadmap."));
    return;
  }
  const checkpoint = snapshot.checkpoints.find((item) => item.id === checkpointId);
  if (!checkpoint) {
    response.status(404).json({ error: "Checkpoint not found." });
    return;
  }
  const progress = normalizeCheckpointProgress(application.checkpointProgress, snapshot);
  const current = progress.entries.find((entry) => entry.checkpointId === checkpointId)!;
  const completed = request.body?.completed === true;
  const note = normalizeOptionalString(request.body?.note)?.slice(0, 1000) ?? current.note;
  if (completed) {
    const requirements = normalizeSubmissionRequirements(application.project.submissionRequirements, application.project.deliverable);
    const evidenceErrors =
      checkpoint.completionMode === "EVIDENCE"
        ? validateCheckpointEvidence(
            application.submissions.flatMap((submission) => submission.items),
            requirements,
            checkpoint.submissionRequirementKeys,
          )
        : [];
    const completionError = checkpointCompletionError({
      checkpoint,
      progress,
      completed,
      note: note ?? null,
      missingEvidenceKeys: evidenceErrors,
    });
    if (completionError === "CHECKPOINT_PREREQUISITE_INCOMPLETE") {
      response.status(409).json(transitionError("CHECKPOINT_PREREQUISITE_INCOMPLETE", "Finish the previous required checkpoint first."));
      return;
    }
    if (completionError === "CHECKPOINT_NOTE_REQUIRED") {
      response
        .status(409)
        .json(transitionError("CHECKPOINT_NOTE_REQUIRED", "Add a note of at least 20 characters describing the output or decision."));
      return;
    }
    if (completionError === "CHECKPOINT_EVIDENCE_REQUIRED") {
      await recordProductEvent({
        userId: request.user!.id,
        eventType: "CHECKPOINT_EVIDENCE_VALIDATION_FAILED",
        projectId,
        applicationId: application.id,
        properties: { checkpointId, completionMode: checkpoint.completionMode },
      });
      response
        .status(409)
        .json({
          ...transitionError("CHECKPOINT_EVIDENCE_REQUIRED", "Add the required submission evidence before completing this checkpoint."),
          missingRequirements: evidenceErrors,
        });
      return;
    }
  }
  const wasCompleted = current.completed;
  current.completed = completed;
  current.completedAt = completed ? (current.completedAt ?? new Date().toISOString()) : null;
  current.note = note ?? null;
  await prisma.projectApplication.update({
    where: { id: application.id },
    data: { checkpointProgress: progress as unknown as Prisma.InputJsonValue },
  });
  if (completed && !wasCompleted) {
    await recordProductEvent({
      userId: request.user!.id,
      eventType: "CHECKPOINT_COMPLETED",
      projectId,
      applicationId: application.id,
      properties: { checkpointId, completionMode: checkpoint.completionMode, estimatedMinutes: checkpoint.estimatedMinutes },
      dedupeScope: `${application.id}:${checkpointId}`,
    });
  }
  response.json({ checkpointProgress: progress });
});

router.post("/:projectId/checkpoints/:checkpointId/view", requireAuth, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const checkpointId = firstParam(request.params.checkpointId);
  const application = await prisma.projectApplication.findUnique({
    where: { userId_projectId: { userId: request.user!.id, projectId } },
    select: { id: true, roadmapSnapshot: true },
  });
  const snapshot = parseRoadmapSnapshot(application?.roadmapSnapshot);
  const checkpoint = snapshot?.checkpoints.find((item) => item.id === checkpointId);
  if (!application || !checkpoint) {
    response.status(404).json({ error: "Checkpoint not found." });
    return;
  }
  await recordProductEvent({
    userId: request.user!.id,
    eventType: "CHECKPOINT_VIEWED",
    projectId,
    applicationId: application.id,
    properties: { checkpointId, completionMode: checkpoint.completionMode },
    dedupeScope: `${application.id}:${checkpointId}`,
  });
  response.status(204).send();
});

router.post("/:projectId/checkpoints/:checkpointId/feedback", requireAuth, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const checkpointId = firstParam(request.params.checkpointId);
  const helpful = typeof request.body?.helpful === "boolean" ? request.body.helpful : null;
  const issueCode = normalizeCheckpointFeedbackIssue(request.body?.issueCode);
  if (helpful === null) {
    response.status(400).json({ error: "Feedback must include a helpful response." });
    return;
  }
  const application = await prisma.projectApplication.findUnique({
    where: { userId_projectId: { userId: request.user!.id, projectId } },
    select: { id: true, roadmapSnapshot: true },
  });
  const snapshot = parseRoadmapSnapshot(application?.roadmapSnapshot);
  if (!application || !snapshot?.checkpoints.some((item) => item.id === checkpointId)) {
    response.status(404).json({ error: "Checkpoint not found." });
    return;
  }
  try {
    await saveProductEvent({
      userId: request.user!.id,
      eventType: "ROADMAP_FEEDBACK_RECORDED",
      projectId,
      applicationId: application.id,
      properties: { checkpointId, helpful, issueCode: issueCode ?? "NONE" },
      dedupeScope: `${application.id}:${checkpointId}`,
    });
    response.json({ saved: true });
  } catch {
    response.status(503).json({ error: "Feedback could not be saved. Please try again." });
  }
});

router.post("/:projectId/apply", requireAuth, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const entitlement = await canStartProject(request.user!.id, projectId);
  if (!entitlement.allowed) {
    const status = entitlement.code === "PROJECT_NOT_ELIGIBLE" ? 404 : 403;
    response
      .status(status)
      .json({
        error:
          entitlement.code === "RECOMMENDATIONS_REQUIRED"
            ? "Generate your recommendations before starting a project."
            : entitlement.code === "PROJECT_LOCKED"
              ? "This project requires pilot access."
              : "Project not found.",
        code: entitlement.code,
      });
    return;
  }
  const existing = await prisma.projectApplication.findUnique({ where: { userId_projectId: { userId: request.user!.id, projectId } } });
  const transition = applyTransition(existing?.status ?? null);
  if (transition === "REJECT") {
    response.status(409).json(transitionError("INVALID_APPLICATION_TRANSITION", "This project already has submitted or reviewed work."));
    return;
  }
  if (transition === "UNCHANGED") {
    response.json({ application: existing, idempotent: true });
    return;
  }
  const [project, profile] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true, difficulty: true, deliverable: true, submissionRequirements: true, checkpointPlan: true },
    }),
    prisma.studentProfile.findUnique({ where: { userId: request.user!.id } }),
  ]);
  if (!project) {
    response.status(404).json({ error: "Project not found." });
    return;
  }
  const requirements = normalizeSubmissionRequirements(project.submissionRequirements, project.deliverable);
  const parsedPlan = parseCanonicalRoadmap(project.checkpointPlan, {
    projectId,
    requiredSubmissionKeys: requiredRequirementKeys(requirements),
  });
  if (!parsedPlan.plan) {
    response.status(409).json(transitionError("ROADMAP_UNAVAILABLE", "This project roadmap is not ready yet."));
    return;
  }
  const requestedPreferences = normalizeRoadmapPreferences(request.body, project.difficulty);
  const existingSnapshot = parseRoadmapSnapshot(existing?.roadmapSnapshot);
  const preferences = existingSnapshot?.preferences ?? requestedPreferences;
  if (!preferences) {
    response.status(400).json({ error: "Choose 1-40 weekly hours and a valid support level." });
    return;
  }
  const snapshot = existingSnapshot
    ? existingSnapshot.schemaVersion === 2
      ? existingSnapshot
      : personalizeRoadmapFromContext(parsedPlan.plan, preferences, roadmapContextFromSnapshot(existingSnapshot))
    : personalizeRoadmap(parsedPlan.plan, preferences, buildProfileFeatures(profile));
  const progress = existingSnapshot
    ? normalizeCheckpointProgress(existing?.checkpointProgress, snapshot)
    : emptyCheckpointProgress(snapshot);
  const application =
    transition === "CREATE"
      ? await prisma.projectApplication.create({
          data: {
            userId: request.user!.id,
            projectId,
            status: "ACTIVE",
            roadmapPreferences: preferences as unknown as Prisma.InputJsonValue,
            roadmapSnapshot: snapshot as unknown as Prisma.InputJsonValue,
            checkpointProgress: progress as unknown as Prisma.InputJsonValue,
          },
        })
      : await prisma.projectApplication.update({
          where: { id: existing!.id },
          data: {
            status: "ACTIVE",
            withdrawnAt: null,
            roadmapPreferences: preferences as unknown as Prisma.InputJsonValue,
            roadmapSnapshot: snapshot as unknown as Prisma.InputJsonValue,
            checkpointProgress: progress as unknown as Prisma.InputJsonValue,
          },
        });
  await recordProductEvent({
    userId: request.user!.id,
    eventType: "ROADMAP_CONFIGURED",
    projectId,
    applicationId: application.id,
    properties: {
      weeklyHours: preferences.weeklyHours,
      supportLevel: preferences.supportLevel,
      source: transition === "CREATE" ? "PROJECT_START" : "REAPPLICATION",
    },
    dedupeScope: application.id,
  });
  await recordProductEvent({
    userId: request.user!.id,
    eventType: "PROJECT_STARTED",
    projectId,
    applicationId: application.id,
    dedupeScope: application.id,
  });
  response
    .status(transition === "CREATE" ? 201 : 200)
    .json({ application: { ...application, roadmapPreferences: preferences, roadmapSnapshot: snapshot, checkpointProgress: progress } });
});

router.delete("/:projectId/apply", requireAuth, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const application = await prisma.projectApplication.findUnique({ where: { userId_projectId: { userId: request.user!.id, projectId } } });
  if (!application) {
    response.status(404).json({ error: "Application not found." });
    return;
  }
  if (application.status !== "ACTIVE") {
    response.status(409).json(transitionError("APPLICATION_NOT_WITHDRAWABLE", "Only active projects can be withdrawn."));
    return;
  }
  try {
    await prisma.$transaction(
      async (transaction) => {
        const write = await transaction.projectApplication.updateMany({
          where: { id: application.id, status: "ACTIVE" },
          data: { status: "WITHDRAWN", withdrawnAt: new Date() },
        });
        if (write.count !== 1) {
          throw new SubmissionConflict("APPLICATION_NOT_WITHDRAWABLE", "This project is no longer active.");
        }
        await transaction.auditLog.create({
          data: {
            actor: request.user!.id,
            action: "PROJECT_WITHDRAWN",
            target: `application:${application.id}`,
            metadata: JSON.stringify({ projectId }),
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof SubmissionConflict || isPrismaWriteConflict(error)) {
      response
        .status(409)
        .json(
          transitionError(
            error instanceof SubmissionConflict ? error.code : "APPLICATION_WRITE_CONFLICT",
            error instanceof Error ? error.message : "The project changed while it was being withdrawn.",
          ),
        );
      return;
    }
    throw error;
  }
  response.status(204).send();
});

router.post("/:projectId/save", requireAuth, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const project = await prisma.project.findFirst({ where: { ...projectCatalogWhere(), id: projectId }, select: { id: true } });

  if (!project) {
    response.status(404).json({ error: "Project not found." });
    return;
  }

  const saved = await prisma.savedProject.upsert({
    where: { userId_projectId: { userId: request.user!.id, projectId } },
    update: {},
    create: { userId: request.user!.id, projectId },
  });

  response.status(201).json({ saved });
});

router.delete("/:projectId/save", requireAuth, async (request, response) => {
  const projectId = firstParam(request.params.projectId);

  await prisma.savedProject.deleteMany({ where: { userId: request.user!.id, projectId } });

  response.status(204).send();
});

router.post("/", requireAuth, async (request, response) => {
  if (!["STUDENT", "ORGANIZATION", "ADMIN"].includes(request.user!.role)) {
    response.status(403).json({ error: "You do not have permission to submit projects." });
    return;
  }

  const title = normalizeOptionalString(request.body?.title);
  const description = normalizeOptionalString(request.body?.description);
  const organizationName = normalizeOptionalString(request.body?.organizationName);
  const sourceType = normalizeChoice(request.body?.sourceType, allowedSourceTypes) ?? defaultSourceType(request.user!.role);
  const opportunityType = normalizeChoice(request.body?.opportunityType, allowedOpportunityTypes) ?? "PROJECT";
  const schoolName = normalizeOptionalString(request.body?.schoolName);
  const externalUrl = normalizeOptionalString(request.body?.externalUrl);
  const locationType = normalizeChoice(request.body?.locationType, allowedLocationTypes);
  const applicationInstructions = normalizeOptionalString(request.body?.applicationInstructions);
  const deadline = normalizeOptionalDate(request.body?.deadline);
  const startsAt = normalizeOptionalDate(request.body?.startsAt);
  const endsAt = normalizeOptionalDate(request.body?.endsAt);
  const category = normalizeOptionalString(request.body?.category);
  const majorTags = normalizeTagList(request.body?.majorTags);
  const interestTags = normalizeTagList(request.body?.interestTags);
  const skillTags = normalizeTagList(request.body?.skillTags);
  const estimatedHours = normalizeOptionalString(request.body?.estimatedHours);
  const difficulty = normalizeChoice(request.body?.difficulty, allowedDifficulties) ?? "BEGINNER";
  const deliverable = normalizeOptionalString(request.body?.deliverable);
  const skills = normalizeOptionalString(request.body?.skills);
  const verificationType = normalizeOptionalString(request.body?.verificationType);
  const verificationMethod = normalizeOptionalString(request.body?.verificationMethod);

  if (!title || !description || !deliverable) {
    response.status(400).json({ error: "Title, description, and deliverable are required." });
    return;
  }

  if (sourceType === "UNIVERSITY" && !schoolName) {
    response.status(400).json({ error: "University projects need a school name." });
    return;
  }

  if (sourceType === "THIRD_PARTY" && !organizationName) {
    response.status(400).json({ error: "Third-party projects need an organization name." });
    return;
  }

  const organizationProfile = await prisma.organizationProfile.findUnique({
    where: { userId: request.user!.id },
    select: { id: true, organizationName: true },
  });

  const project = await prisma.project.create({
    data: {
      title,
      description,
      organizationName: organizationName ?? organizationProfile?.organizationName ?? request.user!.name ?? "Organization",
      sourceType,
      opportunityType,
      moderationStatus: "PENDING_REVIEW",
      visibility: "PUBLIC",
      schoolName,
      externalUrl,
      provenanceStatus: organizationProfile ? "PARTNER_BACKED" : "PRACTICE",
      locationType,
      applicationInstructions,
      deadline,
      startsAt,
      endsAt,
      category,
      majorTags,
      interestTags,
      skillTags: skillTags ?? skills,
      estimatedHours,
      difficulty,
      deliverable,
      submissionRequirements: inferSubmissionRequirements(deliverable),
      skills,
      verificationType: verificationType ?? defaultVerificationType(sourceType),
      verificationMethod: verificationMethod ?? "The organization reviews the deliverable and marks the project complete.",
      status: "DRAFT",
      createdById: request.user!.id,
      organizationId: organizationProfile?.id ?? null,
    },
    select: projectSelect,
  });

  response.status(201).json({ project: formatProject(project) });
});

router.post("/:projectId/submissions", requireAuth, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const deliverableUrl = normalizeOptionalString(request.body?.deliverableUrl);
  const notes = normalizeOptionalString(request.body?.notes);

  const application = await prisma.projectApplication.findUnique({
    where: { userId_projectId: { userId: request.user!.id, projectId } },
    include: { project: { select: { deliverable: true, difficulty: true, submissionRequirements: true } } },
  });

  if (!application) {
    response.status(404).json({ error: "Apply to this project before submitting work." });
    return;
  }

  if (!canEditSubmission(application.status)) {
    response.status(409).json({ error: "This project is not accepting a new submission right now." });
    return;
  }
  let draft = await getOrCreateSubmissionDraft(application.id);
  if (deliverableUrl || notes) {
    draft = await prisma.submission.update({ where: { id: draft.id }, data: { deliverableUrl, notes }, include: { items: true } });
  }

  const requirements = normalizeSubmissionRequirements(application.project.submissionRequirements, application.project.deliverable);
  const roadmapState = await prisma.projectApplication.findUnique({
    where: { id: application.id },
    select: { roadmapSnapshot: true, checkpointProgress: true },
  });
  const roadmapSnapshot = parseRoadmapSnapshot(roadmapState?.roadmapSnapshot);
  if (!roadmapSnapshot) {
    response.status(409).json(transitionError("ROADMAP_UNAVAILABLE", "This application does not have a valid roadmap."));
    return;
  }
  const checkpointProgress = normalizeCheckpointProgress(roadmapState?.checkpointProgress, roadmapSnapshot);
  if (checkpointProgress.entries.some((entry) => !entry.completed)) {
    response.status(409).json(transitionError("CHECKPOINTS_INCOMPLETE", "Finish every project checkpoint before submitting."));
    return;
  }

  const validation = await validateDraftPackage(draft, requirements);
  if (validation.length) {
    response.status(400).json({ error: validation[0], missingRequirements: validation });
    return;
  }

  let submission;
  try {
    submission = await prisma.$transaction(
      async (transaction) => {
        const applicationWrite = await transaction.projectApplication.updateMany({
          where: { id: application.id, status: { in: ["ACTIVE", "NEEDS_REVISION"] } },
          data: { status: "SUBMITTED" },
        });
        if (applicationWrite.count !== 1) {
          throw new SubmissionConflict("SUBMISSION_ALREADY_FINALIZED", "This project is already under review.");
        }
        const draftWrite = await transaction.submission.updateMany({
          where: { id: draft.id, status: "DRAFT", draftOwnerKey: application.id },
          data: { status: "SUBMITTED", draftOwnerKey: null, submittedAt: new Date() },
        });
        if (draftWrite.count !== 1) {
          throw new SubmissionConflict("SUBMISSION_ALREADY_FINALIZED", "This draft has already been submitted.");
        }
        const finalized = await transaction.submission.findUniqueOrThrow({ where: { id: draft.id }, include: { items: true } });
        await transaction.auditLog.create({
          data: {
            actor: request.user!.id,
            action: "SUBMISSION_FINALIZED",
            target: `submission:${draft.id}`,
            metadata: JSON.stringify({ projectId, itemCount: finalized.items.length }),
          },
        });
        return finalized;
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof SubmissionConflict) {
      response.status(409).json(transitionError(error.code, error.message));
      return;
    }
    if (isPrismaWriteConflict(error)) {
      response
        .status(409)
        .json(transitionError("SUBMISSION_WRITE_CONFLICT", "The draft changed while it was being submitted. Refresh and try again."));
      return;
    }
    throw error;
  }
  await recordProductEvent({
    userId: request.user!.id,
    eventType: "SUBMISSION_FINALIZED",
    projectId,
    applicationId: application.id,
    submissionId: submission.id,
    dedupeScope: submission.id,
  });
  response.status(201).json({ submission: serializeSubmission(submission) });
});

router.get("/:projectId/submission-draft", requireAuth, async (request, response) => {
  void cleanupAbandonedSubmissionDrafts();
  const projectId = firstParam(request.params.projectId);
  const application = await findOwnedApplication(request.user!.id, projectId);
  if (!application) {
    response.status(404).json({ error: "Apply to this project before adding evidence." });
    return;
  }
  if (!canEditSubmission(application.status)) {
    response.status(409).json(transitionError("SUBMISSION_LOCKED", "This submission package is locked while it is under review."));
    return;
  }
  const draft = await getOrCreateSubmissionDraft(application.id);
  response.json({
    draft: serializeSubmission(draft),
    requirements: normalizeSubmissionRequirements(application.project.submissionRequirements, application.project.deliverable),
  });
});

router.put("/:projectId/submission-draft", requireAuth, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const application = await findOwnedApplication(request.user!.id, projectId);
  if (!application) {
    response.status(404).json({ error: "Apply to this project before adding evidence." });
    return;
  }
  if (!canEditSubmission(application.status)) {
    response.status(409).json(transitionError("SUBMISSION_LOCKED", "This submission package is locked while it is under review."));
    return;
  }
  const requirements = normalizeSubmissionRequirements(application.project.submissionRequirements, application.project.deliverable);
  const draft = await getOrCreateSubmissionDraft(application.id);
  const notes = normalizeOptionalString(request.body?.notes);
  const incoming = Array.isArray(request.body?.items) ? request.body.items.slice(0, 50) : [];
  const normalized = incoming.map((item: unknown) => normalizeNonFileItem(item, requirements.items)).filter(Boolean) as Array<{
    requirementKey: string;
    kind: string;
    textValue: string | null;
    url: string | null;
  }>;
  const overLimit = requirements.items.find(
    (requirement) => normalized.filter((item) => item.requirementKey === requirement.key).length > requirement.maxItems,
  );
  if (overLimit) {
    response.status(400).json({ error: `${overLimit.title} has too many items.` });
    return;
  }

  const updated = await prisma.$transaction(async (transaction) => {
    await transaction.submissionItem.deleteMany({ where: { submissionId: draft.id, storageKey: null } });
    if (normalized.length)
      await transaction.submissionItem.createMany({ data: normalized.map((item) => ({ ...item, submissionId: draft.id })) });
    return transaction.submission.update({ where: { id: draft.id }, data: { notes }, include: { items: true } });
  });
  for (const requirementKey of [...new Set(normalized.map((item) => item.requirementKey))]) {
    void recordProductEvent({
      userId: request.user!.id,
      eventType: "CHECKPOINT_EVIDENCE_ADDED",
      projectId,
      applicationId: application.id,
      submissionId: draft.id,
      properties: { requirementKey, source: "STRUCTURED_ITEM" },
      dedupeScope: `${draft.id}:${requirementKey}`,
    });
  }
  response.json({ draft: serializeSubmission(updated) });
});

router.post("/:projectId/submission-draft/files", requireAuth, submissionUploadRateLimit, (request, response) => {
  upload.single("file")(request, response, async (error) => {
    try {
      if (error) {
        response
          .status(400)
          .json({
            error:
              error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
                ? "Files must be 25 MB or smaller."
                : "Unable to read that upload.",
          });
        return;
      }
      const projectId = firstParam(request.params.projectId);
      const application = await findOwnedApplication(request.user!.id, projectId);
      if (!application) {
        response.status(404).json({ error: "Apply to this project before uploading evidence." });
        return;
      }
      if (!canEditSubmission(application.status)) {
        response.status(409).json(transitionError("SUBMISSION_LOCKED", "This submission package is locked while it is under review."));
        return;
      }
      if (!request.file) {
        response.status(400).json({ error: "Choose a file to upload." });
        return;
      }
      const requirements = normalizeSubmissionRequirements(application.project.submissionRequirements, application.project.deliverable);
      const requirementKey = String(request.body?.requirementKey ?? "");
      const requirement = requirements.items.find((item) => item.key === requirementKey);
      if (!requirement || !["FILE", "IMAGE", "DOCUMENT"].includes(requirement.kind)) {
        response.status(400).json({ error: "This requirement does not accept file uploads." });
        return;
      }
      const draft = await getOrCreateSubmissionDraft(application.id);
      const fileCount = await prisma.submissionItem.count({ where: { submissionId: draft.id, storageKey: { not: null } } });
      const requirementCount = await prisma.submissionItem.count({ where: { submissionId: draft.id, requirementKey } });
      if (fileCount >= MAX_SUBMISSION_FILES || requirementCount >= requirement.maxItems) {
        response.status(400).json({ error: "This draft already has the maximum number of files." });
        return;
      }
      const validated = await validateUpload(request.file);
      if (requirement.acceptedMimeTypes?.length && !requirement.acceptedMimeTypes.includes(validated.mimeType)) {
        response.status(400).json({ error: "That file type is not accepted for this requirement." });
        return;
      }
      if (requirement.kind === "IMAGE" && !validated.mimeType.startsWith("image/")) {
        response.status(400).json({ error: "Upload an image for this requirement." });
        return;
      }
      if (requirement.kind === "DOCUMENT" && validated.mimeType.startsWith("image/")) {
        response.status(400).json({ error: "Upload a document for this requirement." });
        return;
      }
      const storage = getSubmissionStorage();
      await storage.scan?.(request.file.buffer);
      const storageKey = await storage.put(request.file.buffer, validated.mimeType);
      let item;
      try {
        item = await prisma.submissionItem.create({
          data: {
            submissionId: draft.id,
            requirementKey,
            kind: requirement.kind,
            storageKey,
            originalFileName: validated.originalFileName,
            mimeType: validated.mimeType,
            sizeBytes: validated.sizeBytes,
          },
        });
      } catch (caught) {
        await storage.remove(storageKey).catch(() => undefined);
        throw caught;
      }
      await prisma.auditLog.create({
        data: {
          actor: request.user!.id,
          action: "SUBMISSION_FILE_UPLOADED",
          target: `submission-item:${item.id}`,
          metadata: JSON.stringify({ projectId, mimeType: validated.mimeType, sizeBytes: validated.sizeBytes }),
        },
      });
      void recordProductEvent({
        userId: request.user!.id,
        eventType: "CHECKPOINT_EVIDENCE_ADDED",
        projectId,
        applicationId: application.id,
        submissionId: draft.id,
        properties: { requirementKey, source: "FILE_UPLOAD" },
        dedupeScope: `${draft.id}:${requirementKey}`,
      });
      response.status(201).json({ item: serializeItem(item, draft.id) });
    } catch (caught) {
      response.status(400).json({ error: caught instanceof Error ? caught.message : "Unable to upload that file." });
    }
  });
});

router.delete("/:projectId/submission-draft/items/:itemId", requireAuth, async (request, response) => {
  const projectId = firstParam(request.params.projectId);
  const itemId = firstParam(request.params.itemId);
  const item = await prisma.submissionItem.findFirst({
    where: {
      id: itemId,
      submission: {
        draftOwnerKey: { not: null },
        application: { userId: request.user!.id, projectId, status: { in: ["ACTIVE", "NEEDS_REVISION"] } },
      },
    },
  });
  if (!item) {
    response.status(404).json({ error: "Draft item not found." });
    return;
  }
  await prisma.submissionItem.delete({ where: { id: item.id } });
  if (item.storageKey)
    await getSubmissionStorage()
      .remove(item.storageKey)
      .catch(() => undefined);
  await prisma.auditLog.create({
    data: {
      actor: request.user!.id,
      action: "SUBMISSION_ITEM_REMOVED",
      target: `submission-item:${item.id}`,
      metadata: JSON.stringify({ projectId }),
    },
  });
  response.status(204).send();
});

const projectSelect = {
  id: true,
  title: true,
  description: true,
  organizationName: true,
  sourceType: true,
  provenanceStatus: true,
  opportunityType: true,
  moderationStatus: true,
  visibility: true,
  schoolName: true,
  externalUrl: true,
  locationType: true,
  applicationInstructions: true,
  deadline: true,
  startsAt: true,
  endsAt: true,
  scrapedAt: true,
  lastSeenAt: true,
  category: true,
  majorTags: true,
  interestTags: true,
  skillTags: true,
  estimatedHours: true,
  difficulty: true,
  deliverable: true,
  submissionRequirements: true,
  skills: true,
  verificationType: true,
  verificationMethod: true,
  resumeValue: true,
  proofQuality: true,
  status: true,
  isStarter: true,
  createdAt: true,
  updatedAt: true,
} as const;

function formatProject(
  project: {
    id: string;
    title: string;
    description: string;
    organizationName: string | null;
    sourceType: string;
    provenanceStatus: string;
    opportunityType: string;
    moderationStatus: string;
    visibility: string;
    schoolName: string | null;
    externalUrl: string | null;
    locationType: string | null;
    applicationInstructions: string | null;
    deadline: Date | null;
    startsAt: Date | null;
    endsAt: Date | null;
    scrapedAt: Date | null;
    lastSeenAt: Date | null;
    category: string | null;
    majorTags: string | null;
    interestTags: string | null;
    skillTags: string | null;
    estimatedHours: string | null;
    difficulty: string | null;
    deliverable: string | null;
    submissionRequirements: unknown;
    skills: string | null;
    verificationType: string | null;
    verificationMethod: string | null;
    resumeValue?: number | null;
    proofQuality?: number | null;
    status: string;
    isStarter: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
  personalization?: {
    studentProfile: {
      major: string | null;
      careerInterests: string | null;
      skillsToBuild: string | null;
      projectPreferences: string | null;
      targetRoles?: string | null;
      currentSkills?: string | null;
      resumeStrength?: number | null;
    } | null;
    saved: boolean;
    applicationStatus: string | null;
    matchBand?: string;
    recommendationReason?: string;
    matchDetails?: unknown;
  },
) {
  const source = sourceVerification(project);
  return {
    ...project,
    submissionRequirements: normalizeSubmissionRequirements(project.submissionRequirements, project.deliverable),
    skills: project.skills
      ? project.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      : [],
    majorTags: splitTags(project.majorTags),
    interestTags: splitTags(project.interestTags),
    skillTags: splitTags(project.skillTags),
    sourceLabel: source.label,
    sourceVerification: source,
    recommendationLabel: "",
    matchBand: personalization?.matchBand,
    matchDetails: personalization?.matchDetails,
    recommendationReason: personalization?.recommendationReason ?? "",
    saved: personalization?.saved ?? false,
    applicationStatus: personalization?.applicationStatus ?? null,
  };
}

function firstParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeChoice<T extends readonly string[]>(value: unknown, allowed: T): T[number] | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
  return allowed.includes(normalized as T[number]) ? (normalized as T[number]) : null;
}

function normalizeTagList(value: unknown) {
  if (Array.isArray(value)) {
    const tags = value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
    return tags.length ? tags.join(", ") : null;
  }

  return normalizeOptionalString(value);
}

function normalizeOptionalDate(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function splitTags(value: string | null) {
  return value
    ? value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
}

function defaultSourceType(role: string) {
  return role === "ORGANIZATION" ? "ORGANIZATION_POSTED" : "STUDENT_SUBMITTED";
}

function defaultVerificationType(sourceType: string) {
  if (sourceType === "AI_GENERATED") {
    return "INTRND_REVIEW";
  }

  if (sourceType === "UNIVERSITY") {
    return "CAMPUS_OR_EXTERNAL_REVIEW";
  }

  return "ORGANIZATION_REVIEW";
}

async function findOwnedApplication(userId: string, projectId: string) {
  return prisma.projectApplication.findUnique({
    where: { userId_projectId: { userId, projectId } },
    include: { project: { select: { deliverable: true, difficulty: true, submissionRequirements: true } } },
  });
}

async function getOrCreateSubmissionDraft(applicationId: string) {
  return prisma.submission.upsert({
    where: { draftOwnerKey: applicationId },
    update: {},
    create: { applicationId, draftOwnerKey: applicationId, status: "DRAFT" },
    include: { items: true },
  });
}

function normalizeNonFileItem(value: unknown, requirements: Array<{ key: string; kind: SubmissionEvidenceKind; maxItems: number }>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const requirementKey = String(item.requirementKey ?? "");
  const requirement = requirements.find((entry) => entry.key === requirementKey);
  if (!requirement || !["TEXT", "LINK", "REPOSITORY"].includes(requirement.kind)) return null;
  const textValue = requirement.kind === "TEXT" ? normalizeOptionalString(item.textValue) : null;
  const url = requirement.kind === "TEXT" ? null : normalizeOptionalString(item.url);
  if (requirement.kind === "TEXT" && !textValue) return null;
  if (requirement.kind === "LINK" && (!url || !isHttpsUrl(url))) return null;
  if (requirement.kind === "REPOSITORY" && (!url || !isRepositoryUrl(url))) return null;
  return { requirementKey, kind: requirement.kind, textValue, url };
}

async function validateDraftPackage(
  draft: { deliverableUrl: string | null; items: Array<{ requirementKey: string; kind: string; storageKey: string | null }> },
  requirements: ReturnType<typeof normalizeSubmissionRequirements>,
) {
  const errors: string[] = [];
  for (const requirement of requirements.items) {
    const matches = draft.items.filter((item) => item.requirementKey === requirement.key && item.kind === requirement.kind);
    if (requirement.required && matches.length < requirement.minItems) errors.push(`${requirement.title} is required.`);
    if (matches.length > requirement.maxItems) errors.push(`${requirement.title} has too many items.`);
    for (const item of matches)
      if (item.storageKey && !(await getSubmissionStorage().exists(item.storageKey)))
        errors.push(`${requirement.title} includes a missing upload.`);
  }
  return errors;
}

function serializeSubmission(submission: {
  id: string;
  status: string;
  deliverableUrl: string | null;
  notes: string | null;
  submittedAt?: Date | null;
  reviewedAt?: Date | null;
  reviewedBy?: string | null;
  reviewerName?: string | null;
  reviewerType?: string | null;
  reviewNotes?: string | null;
  resumeBullet?: string | null;
  portfolioSummary?: string | null;
  verifiedSkills?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<Parameters<typeof serializeItem>[0]>;
}) {
  return {
    id: submission.id,
    status: submission.status,
    deliverableUrl: submission.deliverableUrl,
    notes: submission.notes,
    submittedAt: submission.submittedAt ?? null,
    reviewedAt: submission.reviewedAt ?? null,
    reviewedBy: submission.reviewedBy ?? null,
    reviewerName: submission.reviewerName ?? null,
    reviewerType: submission.reviewerType ?? null,
    reviewNotes: submission.reviewNotes ?? null,
    resumeBullet: submission.resumeBullet ?? null,
    portfolioSummary: submission.portfolioSummary ?? null,
    verifiedSkills: splitTags(submission.verifiedSkills ?? null),
    createdAt: submission.createdAt,
    updatedAt: submission.updatedAt,
    items: submission.items.map((item) => serializeItem(item, submission.id)),
  };
}

function requiredRequirementKeys(requirements: ReturnType<typeof normalizeSubmissionRequirements>) {
  return requirements.items.filter((requirement) => requirement.required).map((requirement) => requirement.key);
}

function validateCheckpointEvidence(
  items: Array<{ requirementKey: string; kind: string }>,
  requirements: ReturnType<typeof normalizeSubmissionRequirements>,
  requirementKeys: string[],
) {
  const errors: string[] = [];
  for (const key of requirementKeys) {
    const requirement = requirements.items.find((item) => item.key === key);
    if (!requirement) {
      errors.push(`Unknown evidence requirement: ${key}.`);
      continue;
    }
    const matches = items.filter((item) => item.requirementKey === key && item.kind === requirement.kind);
    if (matches.length < requirement.minItems) errors.push(`${requirement.title} is required.`);
  }
  return errors;
}

function normalizeCheckpointFeedbackIssue(value: unknown) {
  const allowed = ["UNCLEAR", "TOO_BROAD", "WRONG_PROJECT", "TIME_WRONG", "MISSING_RESOURCE", "OTHER"] as const;
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return allowed.includes(normalized as (typeof allowed)[number]) ? normalized : null;
}

class SubmissionConflict extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function isPrismaWriteConflict(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2034");
}

function serializeItem(
  item: {
    id: string;
    requirementKey: string;
    kind: string;
    textValue: string | null;
    url: string | null;
    storageKey: string | null;
    originalFileName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    createdAt: Date;
  },
  submissionId?: string,
) {
  return {
    id: item.id,
    requirementKey: item.requirementKey,
    kind: item.kind,
    textValue: item.textValue,
    url: item.url,
    originalFileName: item.originalFileName,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    createdAt: item.createdAt,
    downloadUrl: item.storageKey && submissionId ? `/api/submissions/${submissionId}/items/${item.id}/download` : null,
  };
}

function projectCatalogWhere() {
  return {
    status: "PUBLISHED",
    moderationStatus: "APPROVED",
    isStarter: false,
    checkpointPlanVersion: { gt: 0 },
    ...pilotCatalogProjectWhere(env.pilotCatalogMode),
  };
}

export default router;
