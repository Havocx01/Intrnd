import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { PILOT_CATALOG_VERSION } from "../pilotCatalog/manifest.js";
import { pilotCatalogProjectWhere } from "../pilotCatalog/eligibility.js";

const READINESS_TIMEOUT_MS = 2500;

export async function readinessReport() {
  const checkedAt = new Date().toISOString();
  try {
    const [database, readyProjects, candidateProjects, invalidReadyRoadmaps, servedProjects] = await withTimeout(
      Promise.all([
        prisma.$queryRaw`SELECT 1`,
        prisma.project.count({
          where: {
            status: "PUBLISHED",
            moderationStatus: "APPROVED",
            isStarter: false,
            checkpointPlanVersion: { gt: 0 },
            pilotCatalogStatus: "PILOT_READY",
            pilotCatalogVersion: PILOT_CATALOG_VERSION,
          },
        }),
        prisma.project.count({
          where: {
            status: "PUBLISHED",
            moderationStatus: "APPROVED",
            isStarter: false,
            pilotCatalogStatus: { in: ["CANDIDATE", "PILOT_READY"] },
            pilotCatalogVersion: PILOT_CATALOG_VERSION,
          },
        }),
        prisma.project.count({
          where: { pilotCatalogStatus: "PILOT_READY", pilotCatalogVersion: PILOT_CATALOG_VERSION, checkpointPlanVersion: { lte: 0 } },
        }),
        prisma.project.count({
          where: {
            status: "PUBLISHED",
            moderationStatus: "APPROVED",
            isStarter: false,
            checkpointPlanVersion: { gt: 0 },
            ...pilotCatalogProjectWhere(env.pilotCatalogMode),
          },
        }),
      ]),
      READINESS_TIMEOUT_MS,
    );
    void database;
    const storageConfigured =
      env.nodeEnv !== "production" ||
      env.submissionStorageProvider !== "r2" ||
      Boolean(env.r2AccountId && env.r2AccessKeyId && env.r2SecretAccessKey && env.r2BucketName);
    const malwareScannerConfigured = env.nodeEnv !== "production" || Boolean(env.clamavHost && env.clamavPort);
    const pilotThresholdMet = env.pilotCatalogMode !== "READY_ONLY" || readyProjects >= env.pilotMinimumReady;
    const ready = storageConfigured && malwareScannerConfigured && invalidReadyRoadmaps === 0 && pilotThresholdMet && servedProjects > 0;
    return {
      ready,
      checkedAt,
      checks: {
        database: true,
        storageConfigured,
        malwareScannerConfigured,
        pilotCatalogMode: env.pilotCatalogMode,
        pilotCatalogVersion: PILOT_CATALOG_VERSION,
        candidateProjects,
        readyProjects,
        servedProjects,
        minimumReadyProjects: env.pilotMinimumReady,
        pilotThresholdMet,
        invalidReadyRoadmaps,
      },
    };
  } catch (error) {
    return {
      ready: false,
      checkedAt,
      checks: { database: false },
      error:
        error instanceof Error && error.message === "READINESS_TIMEOUT"
          ? "Readiness checks timed out."
          : "A required dependency is unavailable.",
    };
  }
}

async function withTimeout<T>(promise: Promise<T>, milliseconds: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error("READINESS_TIMEOUT")), milliseconds);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
