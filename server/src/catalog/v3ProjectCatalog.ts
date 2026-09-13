import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma.js";
import { pilotSubmissionRequirements } from "./pilotSubmissionRequirements.v1.js";

type CsvProject = {
  project_id: string;
  project_title: string;
  major: string;
  target_field: string;
  difficulty: string;
  estimated_time: string;
  skills_required: string;
  skills_learned: string;
  deliverables: string;
  resume_value_1_10: string;
  portfolio_value_1_10: string;
  verification_type: string;
  source_type: string;
  career_signal: string;
  why_this_project_is_good: string;
};

export type CatalogImportResult = { source: "database" | "csv import" | "missing"; count: number; imported: number; csvPath?: string };

let importPromise: Promise<CatalogImportResult> | null = null;

export async function ensureV3ProjectCatalog(options: { force?: boolean } = {}): Promise<CatalogImportResult> {
  if (options.force) {
    return importV3ProjectCatalog(true);
  }
  if (!importPromise) {
    importPromise = importV3ProjectCatalog();
  }
  return importPromise;
}

async function importV3ProjectCatalog(force = false): Promise<CatalogImportResult> {
  const existingCount = await prisma.project.count({
    where: { id: { startsWith: "P" }, status: "PUBLISHED", moderationStatus: "APPROVED", isStarter: false },
  });
  const legacyProvenanceCount = await prisma.project.count({
    where: { id: { startsWith: "P" }, sourceType: "AI_GENERATED", isStarter: false },
  });

  if (!force && existingCount >= 50 && legacyProvenanceCount === 0) {
    return { source: "database", count: existingCount, imported: 0 };
  }

  const csvPath = await findProjectsCsv();
  if (!csvPath) {
    return { source: "missing", count: existingCount, imported: 0 };
  }

  const rows = parseCsv(await fs.readFile(csvPath, "utf8")) as CsvProject[];
  if (rows.length === 0) {
    return { source: "csv import", count: existingCount, imported: 0, csvPath };
  }

  const systemUser = await getSystemUser();
  let imported = 0;

  for (const row of rows) {
    const id = clean(row.project_id);
    const title = clean(row.project_title);
    const description = clean(row.why_this_project_is_good) || clean(row.career_signal);
    const deliverable = clean(row.deliverables);
    const provenance = catalogSourceMetadataFor(row.source_type);
    const submissionRequirements = pilotSubmissionRequirements(id);
    const submissionRequirementData = submissionRequirements
      ? { submissionRequirements: submissionRequirements as unknown as Prisma.InputJsonValue }
      : {};

    if (!id || !title || !description || !deliverable) continue;

    await prisma.project.upsert({
      where: { id },
      create: {
        id,
        title,
        description,
        organizationName: provenance.organizationName,
        sourceType: provenance.sourceType,
        provenanceStatus: "PRACTICE",
        opportunityType: opportunityTypeFor(row.source_type),
        moderationStatus: "APPROVED",
        visibility: "PUBLIC",
        schoolName: provenance.schoolName,
        category: clean(row.target_field) || clean(row.major) || null,
        majorTags: clean(row.major) || null,
        interestTags: [row.target_field, row.career_signal, row.source_type].map(clean).filter(Boolean).join(", ") || null,
        skillTags: [row.skills_required, row.skills_learned].map(clean).filter(Boolean).join(", ") || null,
        estimatedHours: clean(row.estimated_time) || null,
        difficulty: normalizeDifficulty(row.difficulty),
        deliverable,
        skills: clean(row.skills_learned) || clean(row.skills_required) || null,
        verificationType: clean(row.verification_type) || defaultVerificationType(row.source_type),
        verificationMethod: clean(row.verification_type)
          ? `${clean(row.verification_type)} is used as the review/proof signal for this project.`
          : "The deliverable is reviewed for completeness and usefulness.",
        resumeValue: toInt(row.resume_value_1_10),
        proofQuality: toInt(row.portfolio_value_1_10),
        rankScore: rankScoreFor(row),
        status: "PUBLISHED",
        isStarter: false,
        createdById: systemUser.id,
        ...submissionRequirementData,
      },
      update: {
        title,
        description,
        organizationName: provenance.organizationName,
        sourceType: provenance.sourceType,
        provenanceStatus: "PRACTICE",
        opportunityType: opportunityTypeFor(row.source_type),
        moderationStatus: "APPROVED",
        visibility: "PUBLIC",
        schoolName: provenance.schoolName,
        category: clean(row.target_field) || clean(row.major) || null,
        majorTags: clean(row.major) || null,
        interestTags: [row.target_field, row.career_signal, row.source_type].map(clean).filter(Boolean).join(", ") || null,
        skillTags: [row.skills_required, row.skills_learned].map(clean).filter(Boolean).join(", ") || null,
        estimatedHours: clean(row.estimated_time) || null,
        difficulty: normalizeDifficulty(row.difficulty),
        deliverable,
        skills: clean(row.skills_learned) || clean(row.skills_required) || null,
        verificationType: clean(row.verification_type) || defaultVerificationType(row.source_type),
        verificationMethod: clean(row.verification_type)
          ? `${clean(row.verification_type)} is used as the review/proof signal for this project.`
          : "The deliverable is reviewed for completeness and usefulness.",
        resumeValue: toInt(row.resume_value_1_10),
        proofQuality: toInt(row.portfolio_value_1_10),
        rankScore: rankScoreFor(row),
        status: "PUBLISHED",
        isStarter: false,
        createdById: systemUser.id,
        ...submissionRequirementData,
      },
    });
    imported += 1;
  }

  const count = await prisma.project.count({
    where: { id: { startsWith: "P" }, status: "PUBLISHED", moderationStatus: "APPROVED", isStarter: false },
  });

  return { source: "csv import", count, imported, csvPath };
}

async function findProjectsCsv(): Promise<string | null> {
  const candidates = [
    path.resolve(process.cwd(), "datasets/v3/projects_v3.csv"),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
    }
  }

  return null;
}

async function getSystemUser() {
  const passwordHash = await bcrypt.hash(randomUUID(), 12);
  return prisma.user.upsert({
    where: { email: "system@getintrnd.com" },
    update: { passwordHash },
    create: { email: "system@getintrnd.com", name: "Intrnd", passwordHash, role: "ADMIN", accountType: "SYSTEM" },
    select: { id: true },
  });
}

function parseCsv(csv: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current);
  if (row.some((cell) => cell.trim())) rows.push(row);

  const headers = rows.shift()?.map((header) => header.trim()) ?? [];
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ""])));
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDifficulty(value: string): string {
  const normalized = clean(value).toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
  if (["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(normalized)) return normalized;
  return "BEGINNER";
}

export type CatalogSourceMetadata = { sourceType: string; sourceLabel: string; organizationName: string | null; schoolName: string | null };

// Preserve the source dataset's claims without inventing an owner.
export function catalogSourceMetadataFor(value: string): CatalogSourceMetadata {
  const normalized = clean(value).toLowerCase();
  const mappings: Record<string, CatalogSourceMetadata> = {
    "at-home": { sourceType: "INTRND_CREATED", sourceLabel: "Intrnd-created", organizationName: "Intrnd", schoolName: null },
    "third-party": { sourceType: "THIRD_PARTY", sourceLabel: "Third-party", organizationName: null, schoolName: null },
    "nonprofit/community": { sourceType: "COMMUNITY", sourceLabel: "Community/nonprofit", organizationName: null, schoolName: null },
    "on-campus": { sourceType: "ON_CAMPUS", sourceLabel: "On-campus", organizationName: null, schoolName: null },
    competition: { sourceType: "COMPETITION", sourceLabel: "Competition-style", organizationName: null, schoolName: null },
    "research-style": { sourceType: "RESEARCH_STYLE", sourceLabel: "Research-style", organizationName: null, schoolName: null },
    "local business": { sourceType: "LOCAL_BUSINESS", sourceLabel: "Local-business", organizationName: null, schoolName: null },
  };

  return (
    mappings[normalized] ?? { sourceType: "UNSPECIFIED", sourceLabel: "Source not specified", organizationName: null, schoolName: null }
  );
}

function opportunityTypeFor(value: string): string {
  const normalized = clean(value).toLowerCase();
  if (normalized === "competition") return "COMPETITION";
  if (normalized === "research-style") return "RESEARCH";
  return "PROJECT";
}

function defaultVerificationType(_sourceType: string): string {
  return "Intrnd review";
}

function toInt(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(1, Math.min(10, Math.round(parsed)));
}

function rankScoreFor(row: CsvProject): number {
  const resume = toInt(row.resume_value_1_10) ?? 5;
  const portfolio = toInt(row.portfolio_value_1_10) ?? 5;
  return Math.round(((resume + portfolio) / 2) * 10) / 10;
}
