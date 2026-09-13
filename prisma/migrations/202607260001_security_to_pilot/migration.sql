ALTER TABLE "User" ADD COLUMN "cohortId" TEXT;
ALTER TABLE "ProjectApplication" ADD COLUMN "withdrawnAt" TIMESTAMP(3);

CREATE TABLE "PilotAccessRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestedPlan" TEXT NOT NULL DEFAULT 'PRO',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reason" TEXT,
  "decisionNote" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PilotAccessRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PilotCohort" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "reviewSlaHours" INTEGER NOT NULL DEFAULT 48,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PilotCohort_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "cohortId" TEXT,
  "eventType" TEXT NOT NULL,
  "projectId" TEXT,
  "applicationId" TEXT,
  "submissionId" TEXT,
  "properties" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PilotCohort_name_key" ON "PilotCohort"("name");
CREATE INDEX "User_cohortId_idx" ON "User"("cohortId");
CREATE INDEX "PilotAccessRequest_userId_status_idx" ON "PilotAccessRequest"("userId", "status");
CREATE INDEX "PilotAccessRequest_status_createdAt_idx" ON "PilotAccessRequest"("status", "createdAt");
CREATE INDEX "ProductEvent_eventType_occurredAt_idx" ON "ProductEvent"("eventType", "occurredAt");
CREATE INDEX "ProductEvent_userId_occurredAt_idx" ON "ProductEvent"("userId", "occurredAt");
CREATE INDEX "ProductEvent_cohortId_occurredAt_idx" ON "ProductEvent"("cohortId", "occurredAt");

ALTER TABLE "User" ADD CONSTRAINT "User_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "PilotCohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PilotAccessRequest" ADD CONSTRAINT "PilotAccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductEvent" ADD CONSTRAINT "ProductEvent_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "PilotCohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;
