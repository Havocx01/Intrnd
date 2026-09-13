ALTER TABLE "ProjectApplication" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "ProjectApplication" ADD COLUMN "reviewerName" TEXT;
ALTER TABLE "ProjectApplication" ADD COLUMN "reviewerType" TEXT;
ALTER TABLE "ProjectApplication" ADD COLUMN "reviewNotes" TEXT;
ALTER TABLE "ProjectApplication" ADD COLUMN "resumeBullet" TEXT;
ALTER TABLE "ProjectApplication" ADD COLUMN "portfolioSummary" TEXT;
