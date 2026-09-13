ALTER TABLE "Project"
ADD COLUMN "pilotCatalogStatus" TEXT NOT NULL DEFAULT 'NOT_CANDIDATE',
ADD COLUMN "pilotCatalogVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "pilotCatalogReason" TEXT,
ADD COLUMN "pilotCatalogRiskCodes" JSONB,
ADD COLUMN "pilotReviewedAt" TIMESTAMP(3),
ADD COLUMN "pilotReviewedBy" TEXT,
ADD COLUMN "pilotPublishedAt" TIMESTAMP(3);

CREATE TABLE "ProjectCatalogReview" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "catalogVersion" INTEGER NOT NULL,
  "decision" TEXT NOT NULL,
  "relevance" INTEGER NOT NULL,
  "feasibility" INTEGER NOT NULL,
  "proofValue" INTEGER NOT NULL,
  "readiness" INTEGER NOT NULL,
  "sourceTruth" BOOLEAN NOT NULL,
  "resourceAccess" BOOLEAN NOT NULL,
  "safeScope" BOOLEAN NOT NULL,
  "issueCodes" JSONB,
  "notes" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectCatalogReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectCatalogReview_projectId_reviewerId_catalogVersion_key"
ON "ProjectCatalogReview"("projectId", "reviewerId", "catalogVersion");

CREATE INDEX "ProjectCatalogReview_projectId_catalogVersion_decision_idx"
ON "ProjectCatalogReview"("projectId", "catalogVersion", "decision");

CREATE INDEX "ProjectCatalogReview_reviewerId_createdAt_idx"
ON "ProjectCatalogReview"("reviewerId", "createdAt");

ALTER TABLE "ProjectCatalogReview"
ADD CONSTRAINT "ProjectCatalogReview_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectCatalogReview"
ADD CONSTRAINT "ProjectCatalogReview_reviewerId_fkey"
FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
