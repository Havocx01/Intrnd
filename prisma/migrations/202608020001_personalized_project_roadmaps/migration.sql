-- Intrnd is pre-production: positional checklist progress cannot be mapped
-- safely to stable checkpoint identifiers, so it is intentionally reset.
ALTER TABLE "Project"
ADD COLUMN "checkpointPlan" JSONB,
ADD COLUMN "checkpointPlanVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProjectApplication"
DROP COLUMN "checklistState",
ADD COLUMN "checkpointProgress" JSONB,
ADD COLUMN "roadmapPreferences" JSONB,
ADD COLUMN "roadmapSnapshot" JSONB;

CREATE TABLE "ProjectRoadmapVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "plan" JSONB NOT NULL,
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectRoadmapVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectRoadmapVersion_projectId_version_key"
ON "ProjectRoadmapVersion"("projectId", "version");

CREATE INDEX "ProjectRoadmapVersion_projectId_createdAt_idx"
ON "ProjectRoadmapVersion"("projectId", "createdAt");

ALTER TABLE "ProjectRoadmapVersion"
ADD CONSTRAINT "ProjectRoadmapVersion_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
