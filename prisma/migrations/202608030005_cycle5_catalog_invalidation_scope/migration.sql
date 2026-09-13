CREATE OR REPLACE FUNCTION "invalidatePilotCatalogApproval"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."pilotCatalogStatus" = 'PILOT_READY' AND (
    to_jsonb(OLD)
      - 'updatedAt'
      - 'pilotCatalogStatus'
      - 'pilotCatalogVersion'
      - 'pilotCatalogReason'
      - 'pilotCatalogRiskCodes'
      - 'pilotReviewedAt'
      - 'pilotReviewedBy'
      - 'pilotPublishedAt'
    IS DISTINCT FROM
    to_jsonb(NEW)
      - 'updatedAt'
      - 'pilotCatalogStatus'
      - 'pilotCatalogVersion'
      - 'pilotCatalogReason'
      - 'pilotCatalogRiskCodes'
      - 'pilotReviewedAt'
      - 'pilotReviewedBy'
      - 'pilotPublishedAt'
  ) THEN
    NEW."pilotCatalogStatus" := 'CANDIDATE';
    NEW."pilotReviewedAt" := NULL;
    NEW."pilotReviewedBy" := NULL;
    NEW."pilotPublishedAt" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
