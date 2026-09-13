import type { SubmissionEvidenceKind, SubmissionRequirement, SubmissionRequirements } from "./types.js";

const DOCUMENT_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "text/markdown",
];

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function normalizeSubmissionRequirements(value: unknown, deliverable: string | null | undefined): SubmissionRequirements {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = value as Record<string, unknown>;
    const rawItems = Array.isArray(candidate.items) ? candidate.items : [];
    const items = rawItems.map(normalizeRequirement).filter((item): item is SubmissionRequirement => Boolean(item));
    if (items.length) {
      return { version: 1, instructions: cleanText(candidate.instructions, 500) ?? undefined, items };
    }
  }

  return inferSubmissionRequirements(deliverable);
}

export function inferSubmissionRequirements(deliverable: string | null | undefined): SubmissionRequirements {
  const description = deliverable?.trim() || "Finished project evidence";
  const lower = description.toLowerCase();
  const items: SubmissionRequirement[] = [];

  const add = (kind: SubmissionEvidenceKind, title: string, instructions: string, acceptedMimeTypes?: string[]) => {
    if (items.some((item) => item.kind === kind)) return;
    items.push({
      key: `${kind.toLowerCase()}-${items.length + 1}`,
      title,
      instructions,
      kind,
      required: true,
      minItems: 1,
      maxItems: kind === "IMAGE" || kind === "DOCUMENT" || kind === "FILE" ? 5 : 1,
      acceptedMimeTypes,
    });
  };

  if (/github|gitlab|bitbucket|repository|\brepo\b/.test(lower)) {
    add("REPOSITORY", "Project repository", "Share the repository containing the finished work and its documentation.");
  }
  if (/report|deck|document|workbook|pdf|presentation|memo|spreadsheet|notebook/.test(lower)) {
    add("DOCUMENT", "Final document", `Upload the finished document described in the brief: ${description}.`, DOCUMENT_MIMES);
  }
  if (/screenshot|mockup|image|visual|design/.test(lower)) {
    add("IMAGE", "Visual evidence", "Upload clear images that show the finished result.", IMAGE_MIMES);
  }
  if (/demo video/.test(lower)) {
    add("LINK", "Demo video link", "Share an HTTPS link to a video demonstrating the finished project and its primary workflow.");
  } else if (/deployed|live|website|site|demo|url|web app|dashboard/.test(lower)) {
    add("LINK", "Live project link", "Share an HTTPS link where the reviewer can inspect the finished work.");
  }
  if (!items.length) {
    add("FILE", "Finished deliverable", `Upload the completed work described in the brief: ${description}.`, [
      ...IMAGE_MIMES,
      ...DOCUMENT_MIMES,
    ]);
  }

  return { version: 1, instructions: "Submit the evidence below as one review package.", items };
}

export function isHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function isRepositoryUrl(value: string) {
  if (!isHttpsUrl(value)) return false;
  const url = new URL(value);
  return (
    ["github.com", "gitlab.com", "bitbucket.org"].includes(url.hostname.toLowerCase()) &&
    url.pathname.split("/").filter(Boolean).length >= 2
  );
}

function normalizeRequirement(value: unknown): SubmissionRequirement | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const kind = String(item.kind ?? "").toUpperCase() as SubmissionEvidenceKind;
  if (!["TEXT", "FILE", "IMAGE", "DOCUMENT", "REPOSITORY", "LINK"].includes(kind)) return null;
  const key = cleanKey(item.key);
  const title = cleanText(item.title, 100);
  const instructions = cleanText(item.instructions, 500);
  if (!key || !title || !instructions) return null;
  const required = item.required !== false;
  const minItems = required ? clampInt(item.minItems, 1, 10, 1) : clampInt(item.minItems, 0, 10, 0);
  const maxItems = Math.max(minItems, clampInt(item.maxItems, 1, 10, 1));
  const acceptedMimeTypes = Array.isArray(item.acceptedMimeTypes)
    ? item.acceptedMimeTypes.filter((entry): entry is string => typeof entry === "string").slice(0, 20)
    : undefined;
  return { key, title, instructions, kind, required, minItems, maxItems, acceptedMimeTypes };
}

function cleanKey(value: unknown) {
  if (typeof value !== "string") return null;
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .slice(0, 64);
  return key || null;
}

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ").slice(0, max);
  return text || null;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.min(max, Math.max(min, number)) : fallback;
}
