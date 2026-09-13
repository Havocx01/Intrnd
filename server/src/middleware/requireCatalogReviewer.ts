import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "./requireAuth.js";

declare global {
  namespace Express {
    interface Request {
      catalogReviewerProfile?: {
        userId: string;
        reviewerTypes: string[];
        domainExpertiseIds: string[];
        careerExpertiseIds: string[];
        active: boolean;
      };
    }
  }
}

export async function requireCatalogReviewer(request: Request, response: Response, next: NextFunction) {
  await requireAuth(request, response, async () => {
    const profile = await prisma.catalogReviewerProfile.findUnique({ where: { userId: request.user!.id } });
    if (!profile?.active || !["ADMIN", "REVIEWER"].includes(request.user!.role)) {
      response.status(403).json({ error: "An active catalog reviewer profile is required.", code: "CATALOG_REVIEWER_REQUIRED" });
      return;
    }
    request.catalogReviewerProfile = profile;
    next();
  });
}
