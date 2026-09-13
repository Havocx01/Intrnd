CREATE TABLE "IntrndRecommendationCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rankedResult" TEXT NOT NULL,
    "profileHash" TEXT NOT NULL,
    "projectCatalogVersion" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntrndRecommendationCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntrndRecommendationCache_userId_key" ON "IntrndRecommendationCache"("userId");

ALTER TABLE "IntrndRecommendationCache"
ADD CONSTRAINT "IntrndRecommendationCache_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
