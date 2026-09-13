import { prisma } from "../db/prisma.js";
import type { Prisma } from "@prisma/client";

export const productEventTypes = [
  "RECOMMENDATION_IMPRESSION",
  "PROJECT_OPENED",
  "PROJECT_STARTED",
  "ROADMAP_CONFIGURED",
  "CHECKPOINT_VIEWED",
  "CHECKPOINT_COMPLETED",
  "CHECKPOINT_EVIDENCE_ADDED",
  "CHECKPOINT_EVIDENCE_VALIDATION_FAILED",
  "ROADMAP_FEEDBACK_RECORDED",
  "SUBMISSION_FINALIZED",
  "REVIEW_COMPLETED",
  "PROOF_VIEWED",
  "RESUME_BULLET_COPIED",
  "ACCESS_REQUESTED",
  "ACCESS_GRANTED",
] as const;

export type ProductEventType = (typeof productEventTypes)[number];

type ProductEventInput = {
  userId?: string | null;
  eventType: ProductEventType;
  projectId?: string | null;
  applicationId?: string | null;
  submissionId?: string | null;
  properties?: Record<string, unknown>;
  dedupeScope?: string | null;
};

const allowedPropertyKeys = new Set([
  "rank",
  "matchBand",
  "rankerVersion",
  "decision",
  "checkpointCount",
  "checkpointId",
  "completionMode",
  "estimatedMinutes",
  "weeklyHours",
  "supportLevel",
  "helpful",
  "issueCode",
  "requirementKey",
  "requestedPlan",
  "grantedPlan",
  "source",
  "reviewerName",
  "reviewerId",
  "surface",
]);

export function sanitizeEventProperties(properties: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([key, value]) => allowedPropertyKeys.has(key) && ["string", "number", "boolean"].includes(typeof value))
      .slice(0, 12),
  ) as Prisma.InputJsonObject;
}

export async function recordProductEvent(input: ProductEventInput) {
  try {
    await writeProductEvent(input, false);
  } catch {
    // Telemetry failures must not block the user workflow.
  }
}

// Update existing checkpoint feedback and report database failures to the caller.
export async function saveProductEvent(input: ProductEventInput) {
  await writeProductEvent(input, true);
}

async function writeProductEvent(input: ProductEventInput, updateOnDuplicate: boolean) {
  const user = input.userId ? await prisma.user.findUnique({ where: { id: input.userId }, select: { cohortId: true } }) : null;
  const safeProperties = sanitizeEventProperties(input.properties);
  const dedupeKey = input.dedupeScope
    ? buildProductEventDedupeKey({
        eventType: input.eventType,
        userId: input.userId ?? null,
        cohortId: user?.cohortId ?? null,
        scope: input.dedupeScope,
      })
    : null;
  const properties = Object.keys(safeProperties).length ? safeProperties : undefined;
  const data = {
    userId: input.userId ?? null,
    cohortId: user?.cohortId ?? null,
    eventType: input.eventType,
    projectId: input.projectId ?? null,
    applicationId: input.applicationId ?? null,
    submissionId: input.submissionId ?? null,
    properties,
    dedupeKey,
  } satisfies Prisma.ProductEventUncheckedCreateInput;

  if (dedupeKey) {
    await prisma.productEvent.upsert({
      where: { dedupeKey },
      create: data,
      update: updateOnDuplicate ? { properties, occurredAt: new Date() } : {},
    });
    return;
  }

  await prisma.productEvent.create({ data });
}

export function buildProductEventDedupeKey(input: {
  eventType: ProductEventType;
  userId: string | null;
  cohortId: string | null;
  scope: string;
}) {
  return [input.eventType, input.userId ?? "-", input.cohortId ?? "-", input.scope].join("|");
}
