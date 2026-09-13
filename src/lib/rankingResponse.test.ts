import assert from "node:assert/strict";
import { CURRENT_PROFILE_FEATURE_VERSION, CURRENT_RANKER_VERSION, isCurrentRecommendationResponse } from "./rankingResponse.js";

const currentResponse = {
  rankerVersion: CURRENT_RANKER_VERSION,
  profileFeatureVersion: CURRENT_PROFILE_FEATURE_VERSION,
  recommendations: [],
  catalogVersion: "catalog-1",
  generatedAt: new Date(0).toISOString(),
  cacheStatus: "generated",
};

assert.equal(isCurrentRecommendationResponse(currentResponse), true);
assert.equal(isCurrentRecommendationResponse({ ...currentResponse, rankerVersion: "personalized-rules-v2" }), false);
assert.equal(isCurrentRecommendationResponse({ ...currentResponse, profileFeatureVersion: "legacy" }), false);
assert.equal(isCurrentRecommendationResponse({ ...currentResponse, recommendations: null }), false);

console.log("unified recommendation response tests passed");
