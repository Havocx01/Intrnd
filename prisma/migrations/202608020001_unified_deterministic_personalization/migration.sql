ALTER TABLE "IntrndRecommendationCache" RENAME TO "RecommendationCache";

ALTER TABLE "RecommendationCache" RENAME COLUMN "rankedResult" TO "result";
ALTER TABLE "RecommendationCache" RENAME COLUMN "projectCatalogVersion" TO "catalogVersion";
ALTER TABLE "RecommendationCache" RENAME COLUMN "modelVersion" TO "rankerVersion";

ALTER TABLE "RecommendationCache"
  ALTER COLUMN "result" TYPE JSONB USING "result"::jsonb,
  ADD COLUMN "profileFeatureVersion" TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "RecommendationCache"
  RENAME CONSTRAINT "IntrndRecommendationCache_pkey" TO "RecommendationCache_pkey";
ALTER TABLE "RecommendationCache"
  RENAME CONSTRAINT "IntrndRecommendationCache_userId_fkey" TO "RecommendationCache_userId_fkey";
ALTER INDEX "IntrndRecommendationCache_userId_key" RENAME TO "RecommendationCache_userId_key";
