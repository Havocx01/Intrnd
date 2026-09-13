import { createHash, randomBytes } from "node:crypto";
import type { Response } from "express";
import { prisma } from "../db/prisma.js";
import { setSessionCookie, studentSessionCookie } from "./cookies.js";

export const studentSessionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;

const renewalWindowMs = 14 * 24 * 60 * 60 * 1000;
const activityWriteIntervalMs = 24 * 60 * 60 * 1000;

const sessionUserSelect = { id: true, email: true, name: true, role: true, accountType: true, onboardingCompleted: true } as const;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  accountType: string | null;
  onboardingCompleted: boolean;
};

export async function createStudentSession(userId: string, response: Response) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + studentSessionMaxAgeMs);

  await prisma.$transaction([
    prisma.authSession.deleteMany({ where: { userId, OR: [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }] } }),
    prisma.authSession.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt, lastUsedAt: now } }),
  ]);

  setSessionCookie(response, studentSessionCookie, token, studentSessionMaxAgeMs);
}

export async function resolveStudentSession(token: string, response?: Response): Promise<SessionUser | null> {
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: { id: true, expiresAt: true, lastUsedAt: true, revokedAt: true, user: { select: sessionUserSelect } },
  });

  if (!session) {
    return null;
  }

  const now = new Date();
  if (session.revokedAt || session.expiresAt <= now) {
    await prisma.authSession.deleteMany({ where: { id: session.id } });
    return null;
  }

  const shouldRenew = session.expiresAt.getTime() - now.getTime() <= renewalWindowMs;
  const shouldRecordActivity = now.getTime() - session.lastUsedAt.getTime() >= activityWriteIntervalMs;

  if (shouldRenew || shouldRecordActivity) {
    const expiresAt = shouldRenew ? new Date(now.getTime() + studentSessionMaxAgeMs) : session.expiresAt;

    await prisma.authSession.update({ where: { id: session.id }, data: { lastUsedAt: now, expiresAt } });

    if (shouldRenew && response) {
      setSessionCookie(response, studentSessionCookie, token, studentSessionMaxAgeMs);
    }
  }

  return session.user;
}

export async function revokeStudentSession(token: string | null) {
  if (!token) return;

  await prisma.authSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
