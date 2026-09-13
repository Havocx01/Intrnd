import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getBearerToken, getCookie, studentSessionCookie } from "../auth/cookies.js";
import { createStudentSession, resolveStudentSession, type SessionUser } from "../auth/studentSessions.js";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";

export type AuthenticatedUser = SessionUser;

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

type AuthTokenPayload = { userId: string };

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  const cookieToken = getCookie(request, studentSessionCookie);
  const bearerToken = getBearerToken(request);
  const token = cookieToken ?? bearerToken;

  if (!token) {
    response.status(401).json({ error: "Missing auth token." });
    return;
  }

  try {
    if (cookieToken) {
      const sessionUser = await resolveStudentSession(cookieToken, response);
      if (sessionUser) {
        request.user = sessionUser;
        next();
        return;
      }

      // Exchange still-valid legacy JWT cookies for a revocable session.
      const legacyUser = await resolveLegacyJwtUser(cookieToken);
      if (legacyUser) {
        await createStudentSession(legacyUser.id, response);
        request.user = legacyUser;
        next();
        return;
      }
    }

    if (!bearerToken) {
      response.status(401).json({ error: "Invalid auth session." });
      return;
    }

    const user = await resolveLegacyJwtUser(bearerToken);
    if (!user) {
      response.status(401).json({ error: "Invalid auth token." });
      return;
    }

    request.user = user;
    next();
  } catch {
    response.status(401).json({ error: "Invalid auth session." });
  }
}

async function resolveLegacyJwtUser(token: string): Promise<AuthenticatedUser | null> {
  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as AuthTokenPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, accountType: true, onboardingCompleted: true },
    });

    return user;
  } catch {
    return null;
  }
}
