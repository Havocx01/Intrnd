import "dotenv/config";
import { normalizePilotCatalogMode } from "../pilotCatalog/eligibility.js";

const port = Number(process.env.PORT ?? 4000);
const nodeEnv = process.env.NODE_ENV ?? "development";
const pilotMinimumReady = Number(process.env.PILOT_MINIMUM_READY_PROJECTS ?? 24);

if (Number.isNaN(port)) {
  throw new Error("PORT must be a valid number.");
}
if (!Number.isInteger(pilotMinimumReady) || pilotMinimumReady < 1 || pilotMinimumReady > 130) {
  throw new Error("PILOT_MINIMUM_READY_PROJECTS must be an integer from 1 to 130.");
}

export const env = {
  nodeEnv,
  port,
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://127.0.0.1:5173",
  jwtSecret: process.env.JWT_SECRET ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? process.env.VITE_GOOGLE_CLIENT_ID ?? "",
  aiBaseUrl: process.env.AI_BASE_URL ?? "http://localhost:11434/v1",
  aiApiKey: process.env.AI_API_KEY ?? "ollama", // Placeholder required by the SDK for local requests.
  aiModel: process.env.AI_MODEL ?? "deepseek-r1:7b",
  aiReasonerModel: process.env.AI_REASONER_MODEL ?? "deepseek-r1:7b",
  // Experimental AI is opt-in and is not used for production recommendations.
  aiEnabled: (process.env.AI_ENABLED ?? "false").toLowerCase() === "true",
  submissionStorageProvider: (
    process.env.SUBMISSION_STORAGE_PROVIDER ?? (process.env.NODE_ENV === "production" ? "r2" : "local")
  ).toLowerCase(),
  r2AccountId: process.env.R2_ACCOUNT_ID ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2BucketName: process.env.R2_BUCKET_NAME ?? "",
  clamavHost: process.env.CLAMAV_HOST ?? "",
  clamavPort: Number(process.env.CLAMAV_PORT ?? 3310),
  pilotCatalogMode: normalizePilotCatalogMode(process.env.PILOT_CATALOG_MODE, nodeEnv === "production"),
  pilotMinimumReady,
  scraperEnabled: (process.env.SCRAPER_ENABLED ?? "false").toLowerCase() === "true",
};

if (!env.jwtSecret) {
  throw new Error("JWT_SECRET must be set.");
}

if (env.nodeEnv === "production" && env.jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production.");
}
