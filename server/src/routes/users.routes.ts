import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { prisma } from "../db/prisma.js";
import { recordProductEvent, type ProductEventType } from "../telemetry/productEvents.js";
import { roleForOnboarding } from "../auth/roles.js";
import { Prisma } from "@prisma/client";
import { defaultRoadmapPreferences, normalizeRoadmapPreferences } from "../roadmaps/roadmapService.js";

const router = Router();
const DEFAULT_STUDENT_ROADMAP_PREFERENCES = defaultRoadmapPreferences();

router.get("/me", requireAuth, async (request, response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.user!.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      accountType: true,
      plan: true,
      onboardingCompleted: true,
      profileEditsUsed: true,
      profileEditsAllowed: true,
      studentProfile: {
        select: {
          school: true,
          major: true,
          gradYear: true,
          careerInterests: true,
          skillsToBuild: true,
          projectPreferences: true,
          targetRoles: true,
          targetCompanies: true,
          nicheInterests: true,
          experienceLevel: true,
          currentSkills: true,
          resumeStrength: true,
          roadmapDefaults: true,
        },
      },
      organizationProfile: { select: { organizationName: true, organizationType: true, roleTitle: true, helpTopics: true } },
    },
  });

  if (!user) {
    response.status(404).json({ error: "User not found." });
    return;
  }

  const latestRequest = await prisma.profileChangeRequest.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, reason: true, decisionNote: true, createdAt: true, reviewedAt: true },
  });

  response.json({ user: { ...user, canEditProfile: canEditProfile(user), profileChangeRequest: latestRequest } });
});

// Initial onboarding is free; later edits require an unused edit allowance.
function canEditProfile(user: { onboardingCompleted: boolean; profileEditsUsed: number; profileEditsAllowed: number }) {
  return !user.onboardingCompleted || user.profileEditsUsed < user.profileEditsAllowed;
}

router.post("/me/access-request", requireAuth, async (request, response) => {
  const requestedPlan = normalizeChoice(request.body?.requestedPlan, ["PRO", "PRO_PLUS"]) ?? "PRO";
  const reason = text(request.body?.reason);
  const existing = await prisma.pilotAccessRequest.findFirst({
    where: { userId: request.user!.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    response.json({ request: existing, duplicate: true });
    return;
  }
  const accessRequest = await prisma.pilotAccessRequest.create({ data: { userId: request.user!.id, requestedPlan, reason } });
  void recordProductEvent({ userId: request.user!.id, eventType: "ACCESS_REQUESTED", properties: { requestedPlan } });
  response.status(201).json({ request: accessRequest });
});

router.post("/me/events", requireAuth, async (request, response) => {
  const eventType = String(request.body?.eventType ?? "").toUpperCase();
  if (!["RECOMMENDATION_IMPRESSION", "PROOF_VIEWED", "RESUME_BULLET_COPIED", "PROJECT_OPENED"].includes(eventType)) {
    response.status(400).json({ error: "Unsupported client event." });
    return;
  }
  const projectId = text(request.body?.projectId);
  const applicationId = text(request.body?.applicationId);
  const surface = normalizeChoice(request.body?.surface, ["HOME", "BROWSE"]);
  const recommendationCache =
    eventType === "RECOMMENDATION_IMPRESSION"
      ? await prisma.recommendationCache.findUnique({
          where: { userId: request.user!.id },
          select: { rankerVersion: true, generatedAt: true },
        })
      : null;
  await recordProductEvent({
    userId: request.user!.id,
    eventType: eventType as ProductEventType,
    projectId,
    applicationId,
    properties: recommendationCache ? { rankerVersion: recommendationCache.rankerVersion, surface: surface ?? "BROWSE" } : undefined,
    dedupeScope: recommendationCache
      ? `${surface ?? "BROWSE"}:${recommendationCache.rankerVersion}:${recommendationCache.generatedAt.toISOString()}`
      : undefined,
  });
  response.status(204).send();
});

router.put("/onboarding", requireAuth, async (request, response) => {
  const accountType = normalizeChoice(request.body?.accountType, [
    "STUDENT",
    "ORGANIZATION",
    "PROFESSOR",
    "NONPROFIT",
    "STARTUP",
    "LOCAL_BUSINESS",
  ]);

  if (!accountType) {
    response.status(400).json({ error: "Choose an account type." });
    return;
  }

  const profile = request.body?.profile ?? {};
  const isStudent = accountType === "STUDENT";

  const existing = await prisma.user.findUnique({
    where: { id: request.user!.id },
    select: {
      role: true,
      onboardingCompleted: true,
      profileEditsUsed: true,
      profileEditsAllowed: true,
      studentProfile: { select: { roadmapDefaults: true } },
    },
  });

  if (!existing) {
    response.status(404).json({ error: "User not found." });
    return;
  }

  // Only saves after initial onboarding consume the edit allowance.
  const isEdit = existing.onboardingCompleted;
  if (isEdit && existing.profileEditsUsed >= existing.profileEditsAllowed) {
    response
      .status(403)
      .json({ error: "You've already used your profile update. Submit a change request for an admin to approve another edit." });
    return;
  }

  const requestedRoadmapDefaults = normalizeRoadmapPreferences(profile.roadmapDefaults);
  if (isStudent && profile.roadmapDefaults != null && !requestedRoadmapDefaults) {
    response.status(400).json({ error: "Choose 1-40 weekly hours and a valid guidance level." });
    return;
  }
  const roadmapDefaults =
    requestedRoadmapDefaults ??
    normalizeRoadmapPreferences(existing.studentProfile?.roadmapDefaults) ??
    DEFAULT_STUDENT_ROADMAP_PREFERENCES;

  const user = await prisma.user.update({
    where: { id: request.user!.id },
    data: {
      accountType,
      // Account type is user-editable; ADMIN entitlement is not.
      role: roleForOnboarding(existing.role, isStudent ? "STUDENT" : "ORGANIZATION"),
      onboardingCompleted: true,
      ...(isEdit ? { profileEditsUsed: { increment: 1 } } : {}),
      ...(isStudent
        ? {
            studentProfile: {
              upsert: {
                create: {
                  school: text(profile.school),
                  major: text(profile.major),
                  gradYear: numberOrNull(profile.gradYear),
                  careerInterests: text(profile.careerInterests),
                  skillsToBuild: text(profile.skillsToBuild),
                  projectPreferences: text(profile.projectPreferences),
                  targetRoles: text(profile.targetRoles),
                  targetCompanies: text(profile.targetCompanies),
                  nicheInterests: text(profile.nicheInterests),
                  experienceLevel: normalizeChoice(profile.experienceLevel, ["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
                  currentSkills: text(profile.currentSkills),
                  roadmapDefaults: roadmapDefaults as unknown as Prisma.InputJsonValue,
                },
                update: {
                  school: text(profile.school),
                  major: text(profile.major),
                  gradYear: numberOrNull(profile.gradYear),
                  careerInterests: text(profile.careerInterests),
                  skillsToBuild: text(profile.skillsToBuild),
                  projectPreferences: text(profile.projectPreferences),
                  targetRoles: text(profile.targetRoles),
                  targetCompanies: text(profile.targetCompanies),
                  nicheInterests: text(profile.nicheInterests),
                  experienceLevel: normalizeChoice(profile.experienceLevel, ["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
                  currentSkills: text(profile.currentSkills),
                  roadmapDefaults: roadmapDefaults as unknown as Prisma.InputJsonValue,
                },
              },
            },
          }
        : {
            organizationProfile: {
              upsert: {
                create: {
                  organizationName: text(profile.organizationName) || "Untitled Organization",
                  organizationType: accountType,
                  roleTitle: text(profile.roleTitle),
                  helpTopics: text(profile.helpTopics),
                },
                update: {
                  organizationName: text(profile.organizationName) || "Untitled Organization",
                  organizationType: accountType,
                  roleTitle: text(profile.roleTitle),
                  helpTopics: text(profile.helpTopics),
                },
              },
            },
          }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      accountType: true,
      plan: true,
      onboardingCompleted: true,
      studentProfile: { select: { roadmapDefaults: true } },
    },
  });

  await invalidateRecommendationCache(request.user!.id);

  response.json({ user });
});

router.post("/profile-change-request", requireAuth, async (request, response) => {
  const user = await prisma.user.findUnique({
    where: { id: request.user!.id },
    select: { onboardingCompleted: true, profileEditsUsed: true, profileEditsAllowed: true },
  });

  if (!user) {
    response.status(404).json({ error: "User not found." });
    return;
  }

  if (!user.onboardingCompleted) {
    response.status(400).json({ error: "Finish onboarding before requesting a change." });
    return;
  }

  if (user.profileEditsUsed < user.profileEditsAllowed) {
    response.status(400).json({ error: "You can still update your profile directly." });
    return;
  }

  const pending = await prisma.profileChangeRequest.findFirst({
    where: { userId: request.user!.id, status: "PENDING" },
    select: { id: true },
  });

  if (pending) {
    response.status(409).json({ error: "You already have a change request awaiting review." });
    return;
  }

  const created = await prisma.profileChangeRequest.create({
    data: { userId: request.user!.id, reason: longText(request.body?.reason) },
    select: { id: true, status: true, reason: true, decisionNote: true, createdAt: true, reviewedAt: true },
  });

  response.status(201).json({ request: created });
});

async function invalidateRecommendationCache(userId: string) {
  try {
    await prisma.recommendationCache.deleteMany({ where: { userId } });
  } catch (error) {
    if (!isRecommendationCacheMissing(error)) {
      throw error;
    }
  }
}

function isRecommendationCacheMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  const message = typeof maybeError.message === "string" ? maybeError.message : "";
  return maybeError.code === "P2021" || message.includes("RecommendationCache") || message.includes("recommendationCache");
}

function normalizeChoice(value: unknown, allowed: string[]) {
  if (typeof value !== "string") {
    return null;
  }

  return allowed.includes(value) ? value : null;
}

function text(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  return trimmed || null;
}

function longText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1000);
  return trimmed || null;
}

function numberOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export default router;
