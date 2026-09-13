import type { NextFunction, Request, Response } from "express";
import { requireAuth } from "./requireAuth.js";

export async function requireAdmin(request: Request, response: Response, next: NextFunction) {
  await requireAuth(request, response, () => {
    if (request.user?.role !== "ADMIN") {
      response.status(403).json({ error: "Administrator role is required.", code: "ADMIN_ROLE_REQUIRED" });
      return;
    }
    next();
  });
}
