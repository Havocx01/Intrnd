-- Limit onboarding profile changes: every user gets one profile update after
-- signup (profileEditsAllowed defaults to 1). Consuming an update increments
-- profileEditsUsed. Admin-approved change requests raise profileEditsAllowed.
ALTER TABLE "User" ADD COLUMN "profileEditsUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "profileEditsAllowed" INTEGER NOT NULL DEFAULT 1;

-- Requests students submit to unlock an additional profile change.
CREATE TABLE "ProfileChangeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "decisionNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileChangeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProfileChangeRequest_userId_idx" ON "ProfileChangeRequest"("userId");

CREATE INDEX "ProfileChangeRequest_status_idx" ON "ProfileChangeRequest"("status");

ALTER TABLE "ProfileChangeRequest"
ADD CONSTRAINT "ProfileChangeRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
