ALTER TABLE "Project"
  ADD COLUMN "targetRoleIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "competencyIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "portfolioSignalIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "requiredToolIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "accessRequirementIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "recommendedExperienceLevels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "careerTaxonomyVersion" TEXT,
  ADD COLUMN "careerMappingVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProjectCatalogReview"
  ADD COLUMN "reviewType" TEXT NOT NULL DEFAULT 'UNQUALIFIED',
  ADD COLUMN "confidence" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "conflictConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "reviewerExpertiseSnapshot" JSONB,
  ADD COLUMN "scoreJustifications" JSONB;

CREATE TABLE "CatalogReviewerProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "reviewerTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "domainExpertiseIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "careerExpertiseIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "configuredBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogReviewerProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectCatalogReviewAssignment" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "catalogVersion" INTEGER NOT NULL,
  "reviewType" TEXT NOT NULL,
  "reviewerId" TEXT NOT NULL,
  "assignedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectCatalogReviewAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogReviewerProfile_userId_key" ON "CatalogReviewerProfile"("userId");
CREATE INDEX "CatalogReviewerProfile_active_idx" ON "CatalogReviewerProfile"("active");
CREATE UNIQUE INDEX "ProjectCatalogReviewAssignment_projectId_catalogVersion_reviewType_key"
  ON "ProjectCatalogReviewAssignment"("projectId", "catalogVersion", "reviewType");
CREATE INDEX "ProjectCatalogReviewAssignment_reviewerId_catalogVersion_idx"
  ON "ProjectCatalogReviewAssignment"("reviewerId", "catalogVersion");

ALTER TABLE "CatalogReviewerProfile"
  ADD CONSTRAINT "CatalogReviewerProfile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectCatalogReviewAssignment"
  ADD CONSTRAINT "ProjectCatalogReviewAssignment_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectCatalogReviewAssignment"
  ADD CONSTRAINT "ProjectCatalogReviewAssignment_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
