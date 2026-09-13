ALTER TABLE "StudentProfile"
ADD COLUMN "roadmapDefaults" JSONB;

UPDATE "StudentProfile"
SET "roadmapDefaults" = '{"weeklyHours":5,"supportLevel":"STANDARD"}'::jsonb
WHERE "roadmapDefaults" IS NULL;
