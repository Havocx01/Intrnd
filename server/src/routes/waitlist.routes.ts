import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { authRateLimit } from "../middleware/rateLimit.js";

const router = Router();

router.post("/", authRateLimit, async (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const name = normalizeOptionalString(request.body?.name);
  const audience = normalizeChoice(request.body?.audience, ["STUDENT", "ORGANIZATION", "OTHER"]);
  const notes = normalizeOptionalString(request.body?.notes);

  if (!email || !isValidEmail(email)) {
    response.status(400).json({ error: "Enter a valid email address." });
    return;
  }

  const entry = await prisma.waitlistEntry.upsert({
    where: { email },
    update: { name, audience, notes },
    create: { email, name, audience, notes },
    select: { id: true, email: true, audience: true },
  });

  response.status(201).json({ entry });
});

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeChoice(value: unknown, allowed: string[]) {
  return typeof value === "string" && allowed.includes(value) ? value : null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default router;
