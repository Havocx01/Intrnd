-- Add a subscription plan tier to every user. New and existing users
-- default to the free tier; upgrades (e.g. PRO) are set later by the
-- billing/paywall flow.
ALTER TABLE "User" ADD COLUMN "plan" TEXT NOT NULL DEFAULT 'FREE';
