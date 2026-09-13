import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

const allowedExperienceTypes = ["PROJECT", "COMPETITION", "JOB", "INTERNSHIP", "RESEARCH", "COURSE", "CLUB", "VOLUNTEER", "OTHER"] as const;

router.get("/", requireAuth, async (request, response) => {
  const experiences = await prisma.studentExperience.findMany({
    where: { userId: request.user!.id },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    select: experienceSelect,
  });

  response.json({ experiences: experiences.map(formatExperience) });
});

router.post("/", requireAuth, async (request, response) => {
  const title = normalizeOptionalString(request.body?.title);
  const experienceType = normalizeChoice(request.body?.experienceType, allowedExperienceTypes) ?? "PROJECT";
  const organizationName = normalizeOptionalString(request.body?.organizationName);
  const description = normalizeOptionalString(request.body?.description);
  const role = normalizeOptionalString(request.body?.role);
  const startDate = normalizeOptionalDate(request.body?.startDate);
  const endDate = normalizeOptionalDate(request.body?.endDate);
  const skills = normalizeTagList(request.body?.skills);
  const evidenceUrl = normalizeOptionalString(request.body?.evidenceUrl);
  const outcome = normalizeOptionalString(request.body?.outcome);

  if (!title) {
    response.status(400).json({ error: "Title is required." });
    return;
  }

  if (!description && !outcome && !evidenceUrl) {
    response.status(400).json({ error: "Add a description, outcome, or evidence link." });
    return;
  }

  const experience = await prisma.studentExperience.create({
    data: {
      userId: request.user!.id,
      title,
      experienceType,
      organizationName,
      description,
      role,
      startDate,
      endDate,
      skills,
      evidenceUrl,
      outcome,
    },
    select: experienceSelect,
  });

  response.status(201).json({ experience: formatExperience(experience) });
});

router.get("/:experienceId", requireAuth, async (request, response) => {
  const experience = await prisma.studentExperience.findFirst({
    where: { id: firstParam(request.params.experienceId), userId: request.user!.id },
    select: experienceSelect,
  });

  if (!experience) {
    response.status(404).json({ error: "Experience not found." });
    return;
  }

  response.json({ experience: formatExperience(experience) });
});

router.patch("/:experienceId", requireAuth, async (request, response) => {
  const experienceId = firstParam(request.params.experienceId);
  const existingExperience = await prisma.studentExperience.findFirst({
    where: { id: experienceId, userId: request.user!.id },
    select: { id: true },
  });

  if (!existingExperience) {
    response.status(404).json({ error: "Experience not found." });
    return;
  }

  const data: {
    title?: string;
    experienceType?: string;
    organizationName?: string | null;
    description?: string | null;
    role?: string | null;
    startDate?: Date | null;
    endDate?: Date | null;
    skills?: string | null;
    evidenceUrl?: string | null;
    outcome?: string | null;
    aiReviewStatus?: string;
  } = {};

  if ("title" in request.body) {
    const title = normalizeOptionalString(request.body.title);
    if (!title) {
      response.status(400).json({ error: "Title cannot be empty." });
      return;
    }
    data.title = title;
  }

  if ("experienceType" in request.body) {
    data.experienceType = normalizeChoice(request.body.experienceType, allowedExperienceTypes) ?? "PROJECT";
  }

  if ("organizationName" in request.body) {
    data.organizationName = normalizeOptionalString(request.body.organizationName);
  }

  if ("description" in request.body) {
    data.description = normalizeOptionalString(request.body.description);
  }

  if ("role" in request.body) {
    data.role = normalizeOptionalString(request.body.role);
  }

  if ("startDate" in request.body) {
    data.startDate = normalizeOptionalDate(request.body.startDate);
  }

  if ("endDate" in request.body) {
    data.endDate = normalizeOptionalDate(request.body.endDate);
  }

  if ("skills" in request.body) {
    data.skills = normalizeTagList(request.body.skills);
  }

  if ("evidenceUrl" in request.body) {
    data.evidenceUrl = normalizeOptionalString(request.body.evidenceUrl);
  }

  if ("outcome" in request.body) {
    data.outcome = normalizeOptionalString(request.body.outcome);
  }

  if (Object.keys(data).length > 0) {
    data.aiReviewStatus = "NOT_REVIEWED";
  }

  const experience = await prisma.studentExperience.update({ where: { id: experienceId }, data, select: experienceSelect });

  response.json({ experience: formatExperience(experience) });
});

router.delete("/:experienceId", requireAuth, async (request, response) => {
  await prisma.studentExperience.deleteMany({ where: { id: firstParam(request.params.experienceId), userId: request.user!.id } });

  response.status(204).send();
});

const experienceSelect = {
  id: true,
  title: true,
  experienceType: true,
  organizationName: true,
  description: true,
  role: true,
  startDate: true,
  endDate: true,
  skills: true,
  evidenceUrl: true,
  outcome: true,
  aiReviewStatus: true,
  createdAt: true,
  updatedAt: true,
} as const;

function formatExperience(experience: {
  id: string;
  title: string;
  experienceType: string;
  organizationName: string | null;
  description: string | null;
  role: string | null;
  startDate: Date | null;
  endDate: Date | null;
  skills: string | null;
  evidenceUrl: string | null;
  outcome: string | null;
  aiReviewStatus: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return { ...experience, skills: splitTags(experience.skills) };
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

function splitTags(value: string | null) {
  return value
    ? value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
}

export default router;
