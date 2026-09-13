import type { Prisma } from "@prisma/client";
import { PILOT_CATALOG_VERSION } from "./manifest.js";

export const pilotCatalogModes = ["ALL", "CANDIDATES", "READY_ONLY"] as const;
export type PilotCatalogMode = (typeof pilotCatalogModes)[number];

export function normalizePilotCatalogMode(value: unknown, production: boolean): PilotCatalogMode {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (pilotCatalogModes.includes(normalized as PilotCatalogMode)) return normalized as PilotCatalogMode;
  return production ? "READY_ONLY" : "CANDIDATES";
}

export function pilotCatalogProjectWhere(mode: PilotCatalogMode): Prisma.ProjectWhereInput {
  if (mode === "ALL") return {};
  return {
    pilotCatalogVersion: PILOT_CATALOG_VERSION,
    pilotCatalogStatus: mode === "READY_ONLY" ? "PILOT_READY" : { in: ["CANDIDATE", "PILOT_READY"] },
  };
}

export function isPilotCatalogEligible(project: { pilotCatalogStatus: string; pilotCatalogVersion: number }, mode: PilotCatalogMode) {
  if (mode === "ALL") return true;
  if (project.pilotCatalogVersion !== PILOT_CATALOG_VERSION) return false;
  return mode === "READY_ONLY"
    ? project.pilotCatalogStatus === "PILOT_READY"
    : project.pilotCatalogStatus === "CANDIDATE" || project.pilotCatalogStatus === "PILOT_READY";
}
