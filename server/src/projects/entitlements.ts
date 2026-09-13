import { prisma } from "../db/prisma.js";
import { hasFullRecommendationAccess } from "../lib/lockedProjects.js";
import { getRecommendationsForUser } from "../recommendations/recommendationService.js";
import { env } from "../config/env.js";
import { pilotCatalogProjectWhere } from "../pilotCatalog/eligibility.js";

export type StartProjectDecision =
  | { allowed: true }
  | { allowed: false; code: "PROJECT_NOT_ELIGIBLE" | "PROJECT_LOCKED" | "RECOMMENDATIONS_REQUIRED" };

export async function canStartProject(userId: string, projectId: string): Promise<StartProjectDecision> {
  const [user, project] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { plan: true } }),
    prisma.project.findFirst({
      where: {
        id: projectId,
        status: "PUBLISHED",
        moderationStatus: "APPROVED",
        isStarter: false,
        checkpointPlanVersion: { gt: 0 },
        ...pilotCatalogProjectWhere(env.pilotCatalogMode),
      },
      select: { id: true },
    }),
  ]);

  if (!project) return { allowed: false, code: "PROJECT_NOT_ELIGIBLE" };
  if (hasFullRecommendationAccess(user?.plan)) return { allowed: true };

  const recommendations = await getRecommendationsForUser(userId);
  if (!recommendations.ranking.rankedProjects.length) {
    return { allowed: false, code: "RECOMMENDATIONS_REQUIRED" };
  }
  return recommendations.ranking.rankedProjects[0]?.projectId === projectId
    ? { allowed: true }
    : { allowed: false, code: "PROJECT_LOCKED" };
}
