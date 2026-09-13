import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { clearSessionCookie, getCookie, studentSessionCookie } from "../auth/cookies.js";
import { createStudentSession, revokeStudentSession } from "../auth/studentSessions.js";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { authRateLimit } from "../middleware/rateLimit.js";

const router = Router();
const googleClient = new OAuth2Client(env.googleClientId || undefined);

router.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Pragma", "no-cache");
  next();
});

router.get("/status", (_request, response) => {
  response.json({
    configured: true,
    provider: "email-password",
    message: "Email and password authentication is configured for local development.",
  });
});

router.post("/sign-up", authRateLimit, async (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const password = String(request.body?.password ?? "");
  const name = normalizeOptionalString(request.body?.name);
  const accountType = request.body?.accountType === "ORGANIZATION" ? "ORGANIZATION" : "STUDENT";
  const organizationName = normalizeOptionalString(request.body?.organizationName) ?? name;

  if (!email || !isValidEmail(email)) {
    response.status(400).json({ error: "Enter a valid email address." });
    return;
  }

  if (password.length < 8) {
    response.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    response.status(409).json({ error: "An account with that email already exists." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: accountType === "ORGANIZATION" ? "ORGANIZATION" : "STUDENT",
      accountType,
      ...(accountType === "ORGANIZATION"
        ? { onboardingCompleted: true, organizationProfile: { create: { organizationName: organizationName ?? "Organization" } } }
        : { studentProfile: { create: {} } }),
    },
    select: authUserSelect,
  });

  await createStudentSession(user.id, response);

  response.status(201).json({ user });
});

router.post("/sign-in", authRateLimit, async (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const password = String(request.body?.password ?? "");

  if (!email || !password) {
    response.status(400).json({ error: "Email and password are required." });
    return;
  }

  const userWithPassword = await prisma.user.findUnique({ where: { email } });
  const isValidPassword = await bcrypt.compare(password, userWithPassword?.passwordHash ?? dummyPasswordHash);

  if (!userWithPassword || !isValidPassword) {
    response.status(401).json({ error: "Invalid email or password." });
    return;
  }

  await createStudentSession(userWithPassword.id, response);

  response.json({
    user: {
      id: userWithPassword.id,
      email: userWithPassword.email,
      name: userWithPassword.name,
      role: userWithPassword.role,
      accountType: userWithPassword.accountType,
      plan: userWithPassword.plan,
      onboardingCompleted: userWithPassword.onboardingCompleted,
    },
  });
});

router.post("/google", authRateLimit, async (request, response) => {
  if (!env.googleClientId) {
    response.status(503).json({ error: "Google sign-in is not configured yet." });
    return;
  }

  const credential = String(request.body?.credential ?? "");
  const accessToken = String(request.body?.accessToken ?? "");
  const accountType = request.body?.accountType === "ORGANIZATION" ? "ORGANIZATION" : "STUDENT";
  const organizationName = normalizeOptionalString(request.body?.organizationName);

  if (!credential && !accessToken) {
    response.status(400).json({ error: "Google sign-in token is required." });
    return;
  }

  try {
    const googleProfile = credential
      ? await getGoogleProfileFromCredential(credential)
      : await getGoogleProfileFromAccessToken(accessToken);
    const email = normalizeEmail(googleProfile.email);

    if (!email || !isValidEmail(email) || !googleProfile.emailVerified) {
      response.status(401).json({ error: "Google account email could not be verified." });
      return;
    }

    const googleName = normalizeOptionalString(googleProfile.name);
    const existingUser = await prisma.user.findUnique({ where: { email } });

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: { name: existingUser.name ?? googleName, accountType: existingUser.accountType ?? accountType },
          select: authUserSelect,
        })
      : await createGoogleUser({ email, name: googleName, accountType, organizationName });

    await createStudentSession(user.id, response);

    response.json({ user });
  } catch {
    response.status(401).json({ error: "Unable to verify Google sign-in." });
  }
});

router.post("/sign-out", async (request, response) => {
  await revokeStudentSession(getCookie(request, studentSessionCookie));
  clearSessionCookie(response, studentSessionCookie);
  response.status(204).send();
});

const authUserSelect = { id: true, email: true, name: true, role: true, accountType: true, plan: true, onboardingCompleted: true } as const;

async function getGoogleProfileFromCredential(credential: string) {
  const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
  const payload = ticket.getPayload();

  return { email: payload?.email ?? "", emailVerified: payload?.email_verified === true, name: payload?.name ?? null };
}

async function getGoogleProfileFromAccessToken(accessToken: string) {
  const googleResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!googleResponse.ok) {
    throw new Error("Google user profile request failed.");
  }

  const payload = (await googleResponse.json()) as { email?: string; email_verified?: boolean | string; name?: string };

  return {
    email: payload.email ?? "",
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    name: payload.name ?? null,
  };
}

async function createGoogleUser({
  email,
  name,
  accountType,
  organizationName,
}: {
  email: string;
  name: string | null;
  accountType: "STUDENT" | "ORGANIZATION";
  organizationName: string | null;
}) {
  const passwordHash = await bcrypt.hash(`google:${randomUUID()}`, 12);

  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: accountType === "ORGANIZATION" ? "ORGANIZATION" : "STUDENT",
      accountType,
      ...(accountType === "ORGANIZATION"
        ? { onboardingCompleted: true, organizationProfile: { create: { organizationName: organizationName ?? name ?? "Organization" } } }
        : { studentProfile: { create: {} } }),
    },
    select: authUserSelect,
  });
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

// Keep password verification timing similar when an email does not exist.
const dummyPasswordHash = bcrypt.hashSync("intrnd-invalid-password", 12);

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default router;
