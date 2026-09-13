import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import adminRoutes from "./routes/admin.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import authRoutes from "./routes/auth.routes.js";
import experienceRoutes from "./routes/experiences.routes.js";
import majorRoutes from "./routes/majors.routes.js";
import projectRoutes from "./routes/projects.routes.js";
import recommendationRoutes from "./routes/recommendations.routes.js";
import submissionRoutes from "./routes/submissions.routes.js";
import { startScrapeScheduler, stopScrapeScheduler } from "./scraping/scheduler.js";
import userRoutes from "./routes/users.routes.js";
import waitlistRoutes from "./routes/waitlist.routes.js";
import { ensureV3ProjectCatalog } from "./catalog/v3ProjectCatalog.js";
import { syncRoadmapCatalog } from "./roadmaps/syncCatalog.js";
import { syncPilotCatalogCandidates } from "./pilotCatalog/sync.js";
import { attachRequestContext, requestIdFor } from "./middleware/requestContext.js";
import { readinessReport } from "./reliability/readiness.js";
import { syncPilotCareerMappings } from "./career/syncPilotMappings.js";
import reviewerRoutes from "./routes/reviewer.routes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../dist");

if (env.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

app.use((request, response, next) => {
  if (env.nodeEnv === "production") {
    const canonicalUrl = new URL(env.clientOrigin);
    if (request.hostname === `www.${canonicalUrl.hostname}`) {
      response.redirect(308, `${canonicalUrl.origin}${request.originalUrl}`);
      return;
    }
  }
  next();
});

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(attachRequestContext);
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", service: "intrnd-api", uptimeSeconds: Math.floor(process.uptime()) });
});

app.get("/api/health/live", (_request, response) => {
  response.json({ status: "alive", service: "intrnd-api", uptimeSeconds: Math.floor(process.uptime()) });
});

app.get("/api/health/ready", async (_request, response) => {
  const report = await readinessReport();
  response.status(report.ready ? 200 : 503).json({ status: report.ready ? "ready" : "not_ready", ...report });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/majors", majorRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reviewer", reviewerRoutes);

if (env.nodeEnv === "production") {
  app.use(express.static(clientDistPath));

  app.get(/.*/, (_request, response) => {
    response.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.use((_request, response) => {
  response.status(404).json({ error: "Not found", code: "NOT_FOUND", requestId: requestIdFor(response) });
});

app.use((error: unknown, request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const requestId = requestIdFor(response);
  console.error("Unhandled API error", {
    requestId,
    method: request.method,
    path: request.path,
    error: error instanceof Error ? error.message : String(error),
  });
  if (response.headersSent) return;
  response
    .status(500)
    .json({
      error: "Something went wrong. Try again, then share the request reference if it continues.",
      code: "INTERNAL_ERROR",
      requestId,
    });
});

async function start() {
  await ensureV3ProjectCatalog();
  const roadmapCatalog = await syncRoadmapCatalog({ quarantineInvalid: true });
  if (roadmapCatalog.failures.length) {
    console.error("Roadmap catalog validation failures:", JSON.stringify(roadmapCatalog.failures, null, 2));
    console.error(`${roadmapCatalog.failures.length} invalid project(s) were quarantined from discovery. Repair them in Admin.`);
  }
  const pilotCatalog = await syncPilotCatalogCandidates();
  if (pilotCatalog.missing.length) {
    console.error("Pilot catalog candidates missing from the project catalog:", pilotCatalog.missing);
  }
  const careerMappings = await syncPilotCareerMappings();
  if (careerMappings.missingMappings.length || careerMappings.unknownMappings.length || careerMappings.invalidMappings.length) {
    console.error("Pilot career mapping validation failed:", JSON.stringify(careerMappings, null, 2));
  }
  const server = app.listen(env.port, () => {
    console.log(`Intrnd API listening on http://127.0.0.1:${env.port}`);
    if (env.scraperEnabled) startScrapeScheduler();
  });
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; closing Intrnd API.`);
    stopScrapeScheduler();
    server.close(async () => {
      await prisma.$disconnect();
      process.exitCode = 0;
    });
    setTimeout(() => {
      console.error("Graceful shutdown timed out.");
      process.exitCode = 1;
    }, 10_000).unref();
  };
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
}

void start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
