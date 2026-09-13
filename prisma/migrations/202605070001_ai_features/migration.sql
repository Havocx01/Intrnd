-- AlterTable: Add AI fields to StudentProfile
ALTER TABLE "StudentProfile" ADD COLUMN "targetRoles" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "currentSkills" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN "resumeStrength" INTEGER;

-- AlterTable: Add ranking fields to Project
ALTER TABLE "Project" ADD COLUMN "rankScore" DOUBLE PRECISION;
ALTER TABLE "Project" ADD COLUMN "resumeValue" INTEGER;
ALTER TABLE "Project" ADD COLUMN "uniqueness" INTEGER;
ALTER TABLE "Project" ADD COLUMN "proofQuality" INTEGER;

-- CreateTable: AiRecommendation
CREATE TABLE "AiRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "generatedTitle" TEXT,
    "generatedDesc" TEXT,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT,
    "skillGaps" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExperienceScore
CREATE TABLE "ExperienceScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "projectQuality" INTEGER NOT NULL,
    "skillCoverage" INTEGER NOT NULL,
    "careerAlignment" INTEGER NOT NULL,
    "weakAreas" TEXT,
    "nextSteps" TEXT,
    "competitive" BOOLEAN NOT NULL DEFAULT false,
    "modelName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceScore_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRecommendation" ADD CONSTRAINT "AiRecommendation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceScore" ADD CONSTRAINT "ExperienceScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
