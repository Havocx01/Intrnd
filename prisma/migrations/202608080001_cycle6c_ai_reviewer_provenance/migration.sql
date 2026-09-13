-- Record whether each catalog reviewer is a human or a labeled AI agent,
-- and which model family produced each review. AI reviewers never pose as
-- humans: the kind and model label are stamped on the profile, on every
-- review, and in audit logs.

ALTER TABLE "CatalogReviewerProfile"
  ADD COLUMN "reviewerKind" TEXT NOT NULL DEFAULT 'HUMAN',
  ADD COLUMN "modelLabel" TEXT;

ALTER TABLE "ProjectCatalogReview"
  ADD COLUMN "reviewerKind" TEXT NOT NULL DEFAULT 'HUMAN',
  ADD COLUMN "modelLabel" TEXT;
