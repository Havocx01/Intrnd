-- AlterTable
ALTER TABLE "Project" ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'ORGANIZATION_POSTED';
ALTER TABLE "Project" ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW';
ALTER TABLE "Project" ADD COLUMN "schoolName" TEXT;
ALTER TABLE "Project" ADD COLUMN "externalUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "majorTags" TEXT;
ALTER TABLE "Project" ADD COLUMN "interestTags" TEXT;
ALTER TABLE "Project" ADD COLUMN "skillTags" TEXT;
ALTER TABLE "Project" ADD COLUMN "difficulty" TEXT;
ALTER TABLE "Project" ADD COLUMN "verificationType" TEXT;

-- Existing published starter projects are trusted seed data.
UPDATE "Project"
SET "moderationStatus" = 'APPROVED',
    "sourceType" = CASE
      WHEN "isStarter" = true THEN 'BETA_EXAMPLE'
      ELSE "sourceType"
    END
WHERE "status" = 'PUBLISHED';

-- CreateTable
CREATE TABLE "SavedProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedProject_userId_projectId_key" ON "SavedProject"("userId", "projectId");

-- AddForeignKey
ALTER TABLE "SavedProject" ADD CONSTRAINT "SavedProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedProject" ADD CONSTRAINT "SavedProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
