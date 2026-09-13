ALTER TABLE "Project" ADD COLUMN "submissionRequirements" JSONB;

ALTER TABLE "Submission" ADD COLUMN "draftOwnerKey" TEXT;
CREATE UNIQUE INDEX "Submission_draftOwnerKey_key" ON "Submission"("draftOwnerKey");
CREATE INDEX "Submission_applicationId_createdAt_idx" ON "Submission"("applicationId", "createdAt");

CREATE TABLE "SubmissionItem" (
  "id" TEXT NOT NULL,
  "submissionId" TEXT NOT NULL,
  "requirementKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "textValue" TEXT,
  "url" TEXT,
  "storageKey" TEXT,
  "originalFileName" TEXT,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SubmissionItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubmissionItem_submissionId_requirementKey_idx" ON "SubmissionItem"("submissionId", "requirementKey");
ALTER TABLE "SubmissionItem" ADD CONSTRAINT "SubmissionItem_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
