ALTER TABLE "Project" ADD COLUMN "opportunityType" TEXT NOT NULL DEFAULT 'PROJECT';
ALTER TABLE "Project" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PUBLIC';
ALTER TABLE "Project" ADD COLUMN "locationType" TEXT;
ALTER TABLE "Project" ADD COLUMN "applicationInstructions" TEXT;
ALTER TABLE "Project" ADD COLUMN "deadline" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "startsAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "endsAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "scrapedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "lastSeenAt" TIMESTAMP(3);

CREATE TABLE "UniversityOpportunitySource" (
  "id" TEXT NOT NULL,
  "schoolName" TEXT NOT NULL,
  "sourceName" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL DEFAULT 'UNIVERSITY_PAGE',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "lastCheckedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UniversityOpportunitySource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentExperience" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "experienceType" TEXT NOT NULL DEFAULT 'PROJECT',
  "organizationName" TEXT,
  "description" TEXT,
  "role" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "skills" TEXT,
  "evidenceUrl" TEXT,
  "outcome" TEXT,
  "aiReviewStatus" TEXT NOT NULL DEFAULT 'NOT_REVIEWED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentExperience_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiReview" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "projectId" TEXT,
  "studentExperienceId" TEXT,
  "reviewType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "inputSnapshot" TEXT,
  "outputJson" TEXT,
  "modelName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UniversityOpportunitySource_schoolName_status_idx" ON "UniversityOpportunitySource"("schoolName", "status");
CREATE INDEX "StudentExperience_userId_experienceType_idx" ON "StudentExperience"("userId", "experienceType");
CREATE INDEX "AiReview_userId_reviewType_idx" ON "AiReview"("userId", "reviewType");
CREATE INDEX "AiReview_projectId_reviewType_idx" ON "AiReview"("projectId", "reviewType");
CREATE INDEX "AiReview_studentExperienceId_reviewType_idx" ON "AiReview"("studentExperienceId", "reviewType");

ALTER TABLE "StudentExperience" ADD CONSTRAINT "StudentExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_studentExperienceId_fkey" FOREIGN KEY ("studentExperienceId") REFERENCES "StudentExperience"("id") ON DELETE SET NULL ON UPDATE CASCADE;
