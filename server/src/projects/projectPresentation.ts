import type { CanonicalRoadmapPlan } from "../roadmaps/types.js";

export type RoadmapPreview = {
  checkpointCount: number;
  totalEstimatedMinutes: number;
  effortLabel: string;
  scheduleLabel: string;
  weeklyHours: number;
  checkpoints: Array<{ id: string; title: string; objective: string; requiredOutput: string; estimatedMinutes: number }>;
};

export type SourceVerification = {
  status: "INTRND_AUTHORED" | "SOURCE_VERIFIED" | "CATALOG_ONLY";
  label: string;
  note: string;
  verifiedAt: string | null;
};

export function buildRoadmapPreview(value: unknown, weeklyHours = 5): RoadmapPreview | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const plan = value as Partial<CanonicalRoadmapPlan>;
  if (plan.schemaVersion !== 1 || !Array.isArray(plan.checkpoints) || plan.checkpoints.length === 0) return null;
  const checkpoints = plan.checkpoints.flatMap((checkpoint) => {
    const estimatedMinutes = Number(checkpoint?.estimatedMinutesBySupport?.STANDARD);
    if (!checkpoint?.id || !checkpoint.title || !checkpoint.objective || !checkpoint.requiredOutput || !Number.isFinite(estimatedMinutes))
      return [];
    return [
      {
        id: checkpoint.id,
        title: checkpoint.title,
        objective: checkpoint.objective,
        requiredOutput: checkpoint.requiredOutput,
        estimatedMinutes,
      },
    ];
  });
  if (checkpoints.length !== plan.checkpoints.length) return null;
  const normalizedWeeklyHours = Number.isInteger(weeklyHours) && weeklyHours >= 1 && weeklyHours <= 40 ? weeklyHours : 5;
  const totalEstimatedMinutes = checkpoints.reduce((total, checkpoint) => total + checkpoint.estimatedMinutes, 0);
  const estimatedWeeks = Math.max(1, Math.ceil(totalEstimatedMinutes / (normalizedWeeklyHours * 60)));
  return {
    checkpointCount: checkpoints.length,
    totalEstimatedMinutes,
    effortLabel: formatEffort(totalEstimatedMinutes),
    scheduleLabel: `About ${estimatedWeeks} ${estimatedWeeks === 1 ? "week" : "weeks"} at ${normalizedWeeklyHours} hours/week`,
    weeklyHours: normalizedWeeklyHours,
    checkpoints,
  };
}

export function sourceVerification(input: {
  sourceType: string;
  provenanceStatus?: string | null;
  externalUrl?: string | null;
  scrapedAt?: Date | string | null;
  lastSeenAt?: Date | string | null;
}): SourceVerification {
  if (input.provenanceStatus === "PARTNER_BACKED") {
    return {
      status: "SOURCE_VERIFIED",
      label: "Partner-backed project",
      note: "This brief came from a linked Intrnd partner. It is a project brief, not a job opening.",
      verifiedAt: null,
    };
  }

  if (input.provenanceStatus === "PRACTICE") {
    return {
      status: "INTRND_AUTHORED",
      label: "Intrnd practice project",
      note: "Created or adapted for Intrnd’s structured catalog; this is not a live external opening.",
      verifiedAt: null,
    };
  }

  if (["INTRND_CREATED", "AI_GENERATED"].includes(input.sourceType)) {
    return {
      status: "INTRND_AUTHORED",
      label: "Intrnd-created practice project",
      note: "Created for Intrnd’s structured project catalog; this is not a live external opening.",
      verifiedAt: null,
    };
  }

  const verifiedAt = toIsoDate(input.lastSeenAt ?? input.scrapedAt);
  const hasVerifiedSource = input.provenanceStatus === "LIVE_EXTERNAL" && isHttpsUrl(input.externalUrl) && Boolean(verifiedAt);
  if (hasVerifiedSource) {
    return {
      status: "SOURCE_VERIFIED",
      label: verifiedSourceLabel(input.sourceType),
      note: `Linked source checked ${new Date(verifiedAt!).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" })}. Availability can still change.`,
      verifiedAt,
    };
  }

  return {
    status: "CATALOG_ONLY",
    label: catalogOnlyLabel(input.sourceType),
    note: "No currently verified external listing is attached. Treat this as a structured project brief, not a live opening.",
    verifiedAt: null,
  };
}

function formatEffort(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} minutes`;
  if (remainder === 0) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${hours} ${hours === 1 ? "hour" : "hours"} ${remainder} minutes`;
}

function verifiedSourceLabel(sourceType: string) {
  if (["UNIVERSITY", "ON_CAMPUS", "STUDENT_SUBMITTED"].includes(sourceType)) return "Verified campus source";
  if (sourceType === "LOCAL_BUSINESS") return "Verified local-business source";
  if (sourceType === "COMMUNITY") return "Verified community source";
  if (sourceType === "COMPETITION") return "Verified competition source";
  return "Verified external source";
}

function catalogOnlyLabel(sourceType: string) {
  if (["UNIVERSITY", "ON_CAMPUS", "STUDENT_SUBMITTED"].includes(sourceType)) return "Campus-style project";
  if (sourceType === "LOCAL_BUSINESS") return "Local-business practice project";
  if (sourceType === "COMMUNITY") return "Community-style project";
  if (sourceType === "COMPETITION") return "Competition-style project";
  if (sourceType === "RESEARCH_STYLE") return "Research-style project";
  return "External-style catalog project";
}

function isHttpsUrl(value: unknown) {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
