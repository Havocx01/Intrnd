export const projectProvenanceStatuses = ["PRACTICE", "PARTNER_BACKED", "LIVE_EXTERNAL"] as const;
export type ProjectProvenanceStatus = (typeof projectProvenanceStatuses)[number];

export function validateProjectProvenance(input: {
  provenanceStatus: string;
  organizationId?: string | null;
  externalUrl?: string | null;
  scrapedAt?: Date | string | null;
  lastSeenAt?: Date | string | null;
}) {
  const issues: Array<{ code: string; message: string }> = [];
  if (!projectProvenanceStatuses.includes(input.provenanceStatus as ProjectProvenanceStatus)) {
    return [{ code: "PROJECT_PROVENANCE_INVALID", message: "Choose practice, partner-backed, or live external provenance." }];
  }
  if (input.provenanceStatus === "PARTNER_BACKED" && !input.organizationId) {
    issues.push({ code: "PROJECT_PARTNER_REQUIRED", message: "Partner-backed projects require a linked organization account." });
  }
  if (input.provenanceStatus === "LIVE_EXTERNAL") {
    if (!isHttpsUrl(input.externalUrl)) {
      issues.push({ code: "PROJECT_SOURCE_URL_REQUIRED", message: "Live external projects require an HTTPS source URL." });
    }
    if (!toDate(input.lastSeenAt ?? input.scrapedAt)) {
      issues.push({ code: "PROJECT_SOURCE_CHECK_REQUIRED", message: "Live external projects require a source-check timestamp." });
    }
  }
  return issues;
}

function isHttpsUrl(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function toDate(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}
