ALTER TABLE "User" ADD COLUMN "cohortJoinedAt" TIMESTAMP(3);
ALTER TABLE "ProductEvent" ADD COLUMN "dedupeKey" TEXT;

UPDATE "User"
SET "cohortJoinedAt" = "updatedAt"
WHERE "cohortId" IS NOT NULL AND "cohortJoinedAt" IS NULL;

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "eventType", "userId", "cohortId",
        CASE
          WHEN "eventType" = 'RECOMMENDATION_IMPRESSION' THEN COALESCE("properties"->>'rankerVersion', '-')
          WHEN "eventType" = 'PROJECT_STARTED' THEN COALESCE("applicationId", '-')
          WHEN "eventType" = 'CHECKPOINT_COMPLETED' THEN COALESCE("applicationId", '-') || ':' || COALESCE("properties"->>'checkpointCount', '-')
          WHEN "eventType" IN ('SUBMISSION_FINALIZED', 'REVIEW_COMPLETED') THEN COALESCE("submissionId", '-')
          ELSE "id"
        END
      ORDER BY "occurredAt", "id"
    ) AS position
  FROM "ProductEvent"
  WHERE "eventType" IN (
    'RECOMMENDATION_IMPRESSION',
    'PROJECT_STARTED',
    'CHECKPOINT_COMPLETED',
    'SUBMISSION_FINALIZED',
    'REVIEW_COMPLETED'
  )
)
DELETE FROM "ProductEvent"
WHERE "id" IN (SELECT "id" FROM ranked WHERE position > 1);

UPDATE "ProductEvent"
SET "dedupeKey" = "eventType" || '|' || COALESCE("userId", '-') || '|' || COALESCE("cohortId", '-') || '|' ||
  CASE
    WHEN "eventType" = 'RECOMMENDATION_IMPRESSION' THEN COALESCE("properties"->>'rankerVersion', '-')
    WHEN "eventType" = 'PROJECT_STARTED' THEN COALESCE("applicationId", '-')
    WHEN "eventType" = 'CHECKPOINT_COMPLETED' THEN COALESCE("applicationId", '-') || ':' || COALESCE("properties"->>'checkpointCount', '-')
    WHEN "eventType" IN ('SUBMISSION_FINALIZED', 'REVIEW_COMPLETED') THEN COALESCE("submissionId", '-')
    ELSE "id"
  END
WHERE "eventType" IN (
  'RECOMMENDATION_IMPRESSION',
  'PROJECT_STARTED',
  'CHECKPOINT_COMPLETED',
  'SUBMISSION_FINALIZED',
  'REVIEW_COMPLETED'
);

CREATE UNIQUE INDEX "ProductEvent_dedupeKey_key" ON "ProductEvent"("dedupeKey");
