ALTER TABLE "StudentProfile"
ADD COLUMN "experienceLevel" TEXT;

UPDATE "StudentProfile"
SET
  "experienceLevel" = UPPER("currentSkills"),
  "currentSkills" = NULL
WHERE LOWER(TRIM(COALESCE("currentSkills", ''))) IN ('beginner', 'intermediate', 'advanced');

UPDATE "StudentProfile"
SET "skillsToBuild" = NULL
WHERE LOWER(TRIM(COALESCE("skillsToBuild", ''))) = LOWER(TRIM(COALESCE("projectPreferences", '')))
  AND LOWER(TRIM(COALESCE("projectPreferences", ''))) IN (
    'resume bullet',
    'portfolio case study',
    'internship preparation',
    'competition/project experience',
    'skill proof'
  );

ALTER TABLE "Project"
ADD COLUMN "provenanceStatus" TEXT NOT NULL DEFAULT 'PRACTICE';

UPDATE "Project"
SET "provenanceStatus" = 'LIVE_EXTERNAL'
WHERE "externalUrl" LIKE 'https://%'
  AND ("lastSeenAt" IS NOT NULL OR "scrapedAt" IS NOT NULL);

ALTER TABLE "Submission"
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedBy" TEXT,
ADD COLUMN "reviewerName" TEXT,
ADD COLUMN "reviewerType" TEXT,
ADD COLUMN "reviewNotes" TEXT,
ADD COLUMN "resumeBullet" TEXT,
ADD COLUMN "portfolioSummary" TEXT,
ADD COLUMN "verifiedSkills" TEXT;

UPDATE "Submission"
SET "submittedAt" = "createdAt"
WHERE "status" <> 'DRAFT';

UPDATE "Submission" AS submission
SET
  "reviewedAt" = application."reviewedAt",
  "reviewerName" = application."reviewerName",
  "reviewerType" = application."reviewerType",
  "reviewNotes" = application."reviewNotes",
  "resumeBullet" = application."resumeBullet",
  "portfolioSummary" = application."portfolioSummary"
FROM "ProjectApplication" AS application
WHERE submission."applicationId" = application."id"
  AND submission."status" IN ('VERIFIED', 'NEEDS_REVISION');

CREATE INDEX "Submission_applicationId_submittedAt_idx"
ON "Submission"("applicationId", "submittedAt");
