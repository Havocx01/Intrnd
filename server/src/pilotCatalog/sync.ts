import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { PILOT_CATALOG_V1, PILOT_CATALOG_VERSION } from "./manifest.js";

export async function syncPilotCatalogCandidates() {
  const ids = PILOT_CATALOG_V1.map((entry) => entry.projectId);
  const existing = await prisma.project.findMany({
    where: { id: { in: ids } },
    select: { id: true, pilotCatalogStatus: true, pilotCatalogVersion: true, pilotCatalogReason: true, pilotCatalogRiskCodes: true },
  });
  const existingIds = new Set(existing.map((project) => project.id));
  const missing = ids.filter((id) => !existingIds.has(id));

  await prisma.$transaction(async (transaction) => {
    await transaction.project.updateMany({
      where: { pilotCatalogVersion: PILOT_CATALOG_VERSION, pilotCatalogStatus: "CANDIDATE", id: { notIn: ids } },
      data: {
        pilotCatalogStatus: "NOT_CANDIDATE",
        pilotCatalogVersion: 0,
        pilotCatalogReason: null,
        pilotCatalogRiskCodes: Prisma.JsonNull,
      },
    });
    for (const entry of PILOT_CATALOG_V1) {
      const current = existing.find((project) => project.id === entry.projectId);
      if (!current) continue;
      const desiredStatus =
        current.pilotCatalogVersion === PILOT_CATALOG_VERSION && current.pilotCatalogStatus !== "NOT_CANDIDATE"
          ? current.pilotCatalogStatus
          : "CANDIDATE";
      const unchanged =
        desiredStatus === current.pilotCatalogStatus &&
        current.pilotCatalogVersion === PILOT_CATALOG_VERSION &&
        current.pilotCatalogReason === entry.reason &&
        JSON.stringify(current.pilotCatalogRiskCodes ?? []) === JSON.stringify(entry.riskCodes);
      if (unchanged) continue;
      await transaction.project.update({
        where: { id: entry.projectId },
        data: {
          pilotCatalogStatus: desiredStatus,
          pilotCatalogVersion: PILOT_CATALOG_VERSION,
          pilotCatalogReason: entry.reason,
          pilotCatalogRiskCodes: entry.riskCodes as unknown as Prisma.InputJsonValue,
        },
      });
    }
  });

  return { version: PILOT_CATALOG_VERSION, candidates: ids.length, synced: existingIds.size, missing };
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/sync.ts")) {
  try {
    const result = await syncPilotCatalogCandidates();
    console.log(JSON.stringify(result, null, 2));
    if (result.missing.length) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
