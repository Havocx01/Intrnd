import rateLimit, { ipKeyGenerator } from "express-rate-limit";

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (request) =>
    `${ipKeyGenerator(request.ip ?? "unknown")}::${normalizeAccountKey(request.body?.email ?? request.body?.username)}`,
  message: { error: "Too many authentication attempts. Please wait a few minutes and try again." },
});

function normalizeAccountKey(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "unknown";
}

export const aiReviewRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You can request up to 10 AI reviews per day. Try again tomorrow." },
});

export const aiScoreRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You can generate experience scores up to 3 times per hour. Try again later." },
});

export const submissionUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many uploads. Please wait a few minutes and try again." },
});
