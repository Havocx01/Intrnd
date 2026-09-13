ALTER TABLE "ProjectCatalogReview"
ADD COLUMN "projectFingerprint" TEXT NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION "invalidatePilotCatalogApproval"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."pilotCatalogStatus" = 'PILOT_READY' AND (
    OLD."title" IS DISTINCT FROM NEW."title" OR
    OLD."description" IS DISTINCT FROM NEW."description" OR
    OLD."status" IS DISTINCT FROM NEW."status" OR
    OLD."moderationStatus" IS DISTINCT FROM NEW."moderationStatus" OR
    OLD."isStarter" IS DISTINCT FROM NEW."isStarter" OR
    OLD."provenanceStatus" IS DISTINCT FROM NEW."provenanceStatus" OR
    OLD."organizationId" IS DISTINCT FROM NEW."organizationId" OR
    OLD."externalUrl" IS DISTINCT FROM NEW."externalUrl" OR
    OLD."category" IS DISTINCT FROM NEW."category" OR
    OLD."difficulty" IS DISTINCT FROM NEW."difficulty" OR
    OLD."estimatedHours" IS DISTINCT FROM NEW."estimatedHours" OR
    OLD."deliverable" IS DISTINCT FROM NEW."deliverable" OR
    OLD."skills" IS DISTINCT FROM NEW."skills" OR
    OLD."verificationMethod" IS DISTINCT FROM NEW."verificationMethod" OR
    OLD."submissionRequirements" IS DISTINCT FROM NEW."submissionRequirements" OR
    OLD."checkpointPlan" IS DISTINCT FROM NEW."checkpointPlan" OR
    OLD."checkpointPlanVersion" IS DISTINCT FROM NEW."checkpointPlanVersion"
  ) THEN
    NEW."pilotCatalogStatus" := 'CANDIDATE';
    NEW."pilotReviewedAt" := NULL;
    NEW."pilotReviewedBy" := NULL;
    NEW."pilotPublishedAt" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "Project_invalidatePilotCatalogApproval"
BEFORE UPDATE ON "Project"
FOR EACH ROW EXECUTE FUNCTION "invalidatePilotCatalogApproval"();
