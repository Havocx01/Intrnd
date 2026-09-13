import { Router } from "express";
import { getAIReasonerModel, isAIAvailable } from "../ai/client.js";
import { generateRecommendations, generateResumeBullets, reviewProject, scoreExperience } from "../ai/service.js";
import type { ProjectSummary, StudentContext } from "../ai/types.js";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { aiReviewRateLimit, aiScoreRateLimit } from "../middleware/rateLimit.js";

const router = Router();

function param(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

router.use((_req, res, next) => {
  if (!isAIAvailable()) {
    res
      .status(503)
      .json({
        error: "Experimental AI features are disabled. Set AI_ENABLED=true only for local evaluation.",
        code: "EXPERIMENTAL_AI_DISABLED",
      });
    return;
  }
  next();
});

router.get("/recommendations", requireAuth, async (request, response) => {
  const userId = request.user!.id;

  const cached = await prisma.aiRecommendation.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { matchScore: "desc" },
    include: {
      project: {
        select: { id: true, title: true, description: true, category: true, skills: true, difficulty: true, estimatedHours: true },
      },
    },
  });

  if (cached.length > 0) {
    response.json({ recommendations: cached, cached: true });
    return;
  }

  response.json({ recommendations: [], cached: false, message: "No cached recommendations. POST to generate new ones." });
});

router.post("/recommendations", requireAuth, async (request, response) => {
  const userId = request.user!.id;

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { studentProfile: true } });

  if (!user?.studentProfile) {
    response.status(400).json({ error: "Complete onboarding first." });
    return;
  }

  const profile = user.studentProfile;
  const student: StudentContext = {
    major: profile.major,
    gradYear: profile.gradYear,
    school: profile.school,
    careerInterests: profile.careerInterests,
    targetRoles: profile.targetRoles,
    currentSkills: profile.currentSkills,
    skillsToBuild: profile.skillsToBuild,
  };

  const projects = await prisma.project.findMany({
    where: { status: "PUBLISHED", moderationStatus: "APPROVED" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      skills: true,
      difficulty: true,
      estimatedHours: true,
      deliverable: true,
      organizationName: true,
      opportunityType: true,
    },
    take: 50,
  });

  const experiences = await prisma.studentExperience.findMany({
    where: { userId },
    select: { title: true, experienceType: true, skills: true },
  });

  const completedSummary =
    experiences.length > 0 ? experiences.map((e) => `${e.title} (${e.experienceType}, skills: ${e.skills ?? "none"})`).join("; ") : "";

  const projectSummaries: ProjectSummary[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description.slice(0, 200),
    category: p.category,
    skills: p.skills,
    difficulty: p.difficulty,
    estimatedHours: p.estimatedHours,
    deliverable: p.deliverable,
    organizationName: p.organizationName,
    opportunityType: p.opportunityType,
  }));

  try {
    const result = await generateRecommendations(student, projectSummaries, completedSummary);

    await prisma.aiRecommendation.deleteMany({ where: { userId } });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const records = await Promise.all(
      result.recommendations.map((rec) =>
        prisma.aiRecommendation.create({
          data: {
            userId,
            projectId: rec.projectId && projects.some((p) => p.id === rec.projectId) ? rec.projectId : null,
            generatedTitle: rec.title,
            generatedDesc: rec.resumeImpact,
            matchScore: Math.max(0, Math.min(1, rec.matchScore)),
            reasoning: rec.reasoning,
            skillGaps: rec.skillGaps?.join(", ") ?? null,
            isCustom: !rec.projectId,
            expiresAt,
          },
          include: {
            project: {
              select: { id: true, title: true, description: true, category: true, skills: true, difficulty: true, estimatedHours: true },
            },
          },
        }),
      ),
    );

    await prisma.auditLog.create({
      data: { actor: userId, action: "AI_RECOMMENDATIONS", metadata: JSON.stringify({ count: records.length }) },
    });

    response.json({ recommendations: records, cached: false });
  } catch (err) {
    console.error("AI recommendation error:", err);
    response.status(500).json({ error: "Failed to generate recommendations. Try again later." });
  }
});

router.post("/review/experience/:experienceId", aiReviewRateLimit, requireAuth, async (request, response) => {
  const userId = request.user!.id;
  const experienceId = param(request.params.experienceId);

  const experience = await prisma.studentExperience.findFirst({ where: { id: experienceId, userId } });

  if (!experience) {
    response.status(404).json({ error: "Experience not found." });
    return;
  }

  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  const student: StudentContext = {
    major: profile?.major ?? null,
    gradYear: profile?.gradYear ?? null,
    school: profile?.school ?? null,
    careerInterests: profile?.careerInterests ?? null,
    targetRoles: profile?.targetRoles ?? null,
    currentSkills: profile?.currentSkills ?? null,
    skillsToBuild: profile?.skillsToBuild ?? null,
  };

  try {
    const result = await reviewProject(
      {
        title: experience.title,
        description: experience.description,
        experienceType: experience.experienceType,
        skills: experience.skills,
        evidenceUrl: experience.evidenceUrl,
        outcome: experience.outcome,
      },
      student,
    );

    const review = await prisma.aiReview.create({
      data: {
        userId,
        studentExperienceId: experienceId,
        reviewType: "PROJECT_REVIEW",
        status: "COMPLETED",
        inputSnapshot: JSON.stringify({
          title: experience.title,
          description: experience.description,
          skills: experience.skills,
          evidenceUrl: experience.evidenceUrl,
          outcome: experience.outcome,
        }),
        outputJson: JSON.stringify(result),
        modelName: getAIReasonerModel(),
      },
    });

    await prisma.studentExperience.update({ where: { id: experienceId }, data: { aiReviewStatus: "REVIEWED" } });

    await prisma.auditLog.create({
      data: {
        actor: userId,
        action: "AI_PROJECT_REVIEW",
        target: experienceId,
        metadata: JSON.stringify({ rating: result.overallRating, strength: result.resumeStrength }),
      },
    });

    response.json({ review: { ...review, output: result } });
  } catch (err) {
    console.error("AI review error:", err);
    response.status(500).json({ error: "Failed to generate review. Try again later." });
  }
});

router.post("/resume-bullets/:experienceId", aiReviewRateLimit, requireAuth, async (request, response) => {
  const userId = request.user!.id;
  const experienceId = param(request.params.experienceId);

  const experience = await prisma.studentExperience.findFirst({
    where: { id: experienceId, userId },
    select: { title: true, description: true, skills: true, outcome: true },
  });

  if (!experience) {
    response.status(404).json({ error: "Experience not found." });
    return;
  }

  const profile = await prisma.studentProfile.findUnique({ where: { userId }, select: { targetRoles: true } });

  try {
    const result = await generateResumeBullets(experience, profile?.targetRoles ?? null);
    response.json({ bullets: result.bullets });
  } catch (err) {
    console.error("AI resume bullets error:", err);
    response.status(500).json({ error: "Failed to generate resume bullets. Try again later." });
  }
});

router.get("/experience-score", requireAuth, async (request, response) => {
  const userId = request.user!.id;

  const latest = await prisma.experienceScore.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });

  if (latest) {
    response.json({ score: latest });
    return;
  }

  response.json({ score: null, message: "No experience score yet. POST to generate one." });
});

router.post("/experience-score", aiScoreRateLimit, requireAuth, async (request, response) => {
  const userId = request.user!.id;

  const profile = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!profile) {
    response.status(400).json({ error: "Complete onboarding first." });
    return;
  }

  const experiences = await prisma.studentExperience.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });

  if (experiences.length === 0) {
    response.status(400).json({ error: "Add at least one experience before requesting a score." });
    return;
  }

  const student: StudentContext = {
    major: profile.major,
    gradYear: profile.gradYear,
    school: profile.school,
    careerInterests: profile.careerInterests,
    targetRoles: profile.targetRoles,
    currentSkills: profile.currentSkills,
    skillsToBuild: profile.skillsToBuild,
  };

  const experiencesList = experiences
    .map(
      (e, i) =>
        `${i + 1}. "${e.title}" (${e.experienceType}) - ${e.description ?? "No description"} | Skills: ${e.skills ?? "None listed"} | Evidence: ${e.evidenceUrl ?? "None"} | Outcome: ${e.outcome ?? "Not stated"}`,
    )
    .join("\n");

  try {
    const result = await scoreExperience(student, experiencesList);

    const score = await prisma.experienceScore.create({
      data: {
        userId,
        overallScore: Math.max(0, Math.min(100, result.overallScore)),
        projectQuality: Math.max(0, Math.min(100, result.projectQuality)),
        skillCoverage: Math.max(0, Math.min(100, result.skillCoverage)),
        careerAlignment: Math.max(0, Math.min(100, result.careerAlignment)),
        weakAreas: JSON.stringify(result.weakAreas),
        nextSteps: JSON.stringify(result.nextSteps),
        competitive: result.competitive,
        modelName: getAIReasonerModel(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actor: userId,
        action: "AI_EXPERIENCE_SCORE",
        metadata: JSON.stringify({ overallScore: score.overallScore, competitive: score.competitive }),
      },
    });

    response.json({
      score,
      details: {
        summary: result.summary,
        strengths: result.strengths,
        weakAreas: result.weakAreas,
        nextSteps: result.nextSteps,
        competitive: result.competitive,
        competitiveExplanation: result.competitiveExplanation,
        missingExperiences: result.missingExperiences,
      },
    });
  } catch (err) {
    console.error("AI experience score error:", err);
    response.status(500).json({ error: "Failed to generate experience score. Try again later." });
  }
});

router.get("/review/experience/:experienceId", requireAuth, async (request, response) => {
  const userId = request.user!.id;
  const experienceId = param(request.params.experienceId);

  const reviews = await prisma.aiReview.findMany({
    where: { userId, studentExperienceId: experienceId, reviewType: "PROJECT_REVIEW" },
    orderBy: { createdAt: "desc" },
  });

  const formatted = reviews.map((r) => ({ ...r, output: r.outputJson ? JSON.parse(r.outputJson) : null }));

  response.json({ reviews: formatted });
});

router.post("/feedback", requireAuth, async (request, response) => {
  const userId = request.user!.id;
  const { reviewId, helpful, comment } = request.body ?? {};

  if (!reviewId || typeof helpful !== "boolean") {
    response.status(400).json({ error: "reviewId and helpful (boolean) are required." });
    return;
  }

  await prisma.auditLog.create({
    data: { actor: userId, action: "AI_FEEDBACK", target: reviewId, metadata: JSON.stringify({ helpful, comment: comment ?? null }) },
  });

  response.json({ success: true });
});

export default router;
