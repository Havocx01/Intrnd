import "dotenv/config";
import bcrypt from "bcryptjs";
import { ensureV3ProjectCatalog } from "../catalog/v3ProjectCatalog.js";
import { prisma } from "../db/prisma.js";

export const LOCAL_QA_PASSWORD = "IntrndQa!2026";
export const LOCAL_QA_EMAILS = { free: "qa.free@intrnd.local", pilot: "qa.pilot@intrnd.local", admin: "qa.admin@intrnd.local" } as const;

function assertLocalDatabase() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Local QA reset is disabled when NODE_ENV=production.");
  }
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required.");
  const hostname = new URL(raw).hostname.toLowerCase();
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error(`Refusing to reset QA accounts on non-local database host: ${hostname}`);
  }
}

async function resetLocalQa() {
  assertLocalDatabase();
  await ensureV3ProjectCatalog();

  const emails = Object.values(LOCAL_QA_EMAILS);
  const existing = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  const existingIds = existing.map((user) => user.id);

  if (existingIds.length) {
    await prisma.$transaction([
      prisma.project.deleteMany({ where: { createdById: { in: existingIds } } }),
      prisma.user.deleteMany({ where: { id: { in: existingIds } } }),
    ]);
  }

  const cohort = await prisma.pilotCohort.upsert({
    where: { name: "Local Cycle 2 QA" },
    update: { reviewSlaHours: 48 },
    create: { name: "Local Cycle 2 QA", reviewSlaHours: 48 },
  });
  const passwordHash = await bcrypt.hash(LOCAL_QA_PASSWORD, 12);
  const profile = {
    school: "Intrnd Local QA",
    major: "Computer Science",
    gradYear: 2027,
    careerInterests: "Backend software engineering and data products",
    skillsToBuild: "APIs, PostgreSQL, testing",
    projectPreferences: "A three to five week software project with a reviewable repository",
    targetRoles: "Software Engineer, Backend Engineer",
    targetCompanies: "Early-stage technology companies",
    nicheInterests: "Developer tools and education technology",
    experienceLevel: "INTERMEDIATE",
    currentSkills: "JavaScript, TypeScript, React",
    resumeStrength: 4,
    roadmapDefaults: { weeklyHours: 5, supportLevel: "STANDARD" },
  };

  const [free, pilot, admin] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: LOCAL_QA_EMAILS.free,
        name: "QA Free Student",
        passwordHash,
        role: "STUDENT",
        accountType: "STUDENT",
        plan: "FREE",
        onboardingCompleted: true,
        studentProfile: { create: profile },
      },
      select: { id: true, email: true, role: true, plan: true },
    }),
    prisma.user.create({
      data: {
        email: LOCAL_QA_EMAILS.pilot,
        name: "QA Pilot Student",
        passwordHash,
        role: "STUDENT",
        accountType: "STUDENT",
        plan: "FREE",
        cohortId: cohort.id,
        cohortJoinedAt: new Date(),
        onboardingCompleted: true,
        studentProfile: { create: profile },
      },
      select: { id: true, email: true, role: true, plan: true, cohortId: true },
    }),
    prisma.user.create({
      data: {
        email: LOCAL_QA_EMAILS.admin,
        name: "QA Admin",
        passwordHash,
        role: "ADMIN",
        accountType: "STUDENT",
        plan: "PRO_PLUS",
        onboardingCompleted: true,
        studentProfile: { create: profile },
      },
      select: { id: true, email: true, role: true, plan: true },
    }),
  ]);

  console.log(
    JSON.stringify({ cohort: { id: cohort.id, name: cohort.name }, password: LOCAL_QA_PASSWORD, users: { free, pilot, admin } }, null, 2),
  );
}

try {
  await resetLocalQa();
} finally {
  await prisma.$disconnect();
}
