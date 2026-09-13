import type { MarketplaceProject } from "../components/app/AppDataProvider";
import type { MatchBand, MatchDetails } from "./recommendationScore";

export const CURRENT_RANKER_VERSION = "personalized-rules-v3" as const;
export const CURRENT_PROFILE_FEATURE_VERSION = "profile-v1" as const;

export type RecommendationItem = {
  rank: number;
  projectId: string;
  matchBand: MatchBand;
  reasonCodes: string[];
  reason: string;
  matchDetails: MatchDetails;
  project: MarketplaceProject;
};

export type RecommendationResponse = {
  recommendations: RecommendationItem[];
  rankerVersion: typeof CURRENT_RANKER_VERSION;
  profileFeatureVersion: typeof CURRENT_PROFILE_FEATURE_VERSION;
  catalogVersion: string;
  generatedAt: string;
  cacheStatus: "hit" | "generated";
};

export function isCurrentRecommendationResponse(value: unknown): value is RecommendationResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const response = value as Partial<RecommendationResponse>;
  return (
    response.rankerVersion === CURRENT_RANKER_VERSION &&
    response.profileFeatureVersion === CURRENT_PROFILE_FEATURE_VERSION &&
    Array.isArray(response.recommendations)
  );
}
