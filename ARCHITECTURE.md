# Intrnd Architecture

Canonical map of how the codebase is structured. For quickstart/run instructions see `README.md`; for deployment see `DEPLOYMENT.md`.

## Entry Points

| Entry point | Path | How it runs |
|---|---|---|
| Backend (dev) | `server/src/index.ts` | `npm run dev:server` (tsx watch) |
| Backend (prod) | `dist-server/index.js` | `npm start` (compiled via `npm run build:server`) |
| Frontend | `src/main.tsx` → `src/App.tsx` | Vite dev server (dev); served statically by Express (prod) |

**Production serving:** the Express server serves the built React app from `dist/`, all API routes under `/api/*`, and an SPA fallback (`index.html`) for frontend routes like `/dashboard`, `/sign-in`, `/admin`. It redirects the configured origin's `www` alias to the canonical host.

**Frontend bootstrap:** `main.tsx` redirects `localhost` → `127.0.0.1` (cookie consistency), then renders `ErrorBoundary` → `AuthSessionProvider` → `BrowserRouter` → `App`. Astryx design system CSS is imported here.

**Backend startup sequence** (`start()` in `index.ts`):
1. `ensureV3ProjectCatalog()` — import/verify the v3 project catalog
2. `syncRoadmapCatalog({ quarantineInvalid: true })` — validate roadmap plans; invalid projects are quarantined from discovery
3. `syncPilotCatalogCandidates()` — verify pilot manifest entries exist in the catalog
4. `syncPilotCareerMappings()` — validate pilot career mappings
5. Listen on `PORT`, then start the scrape scheduler **only if** `SCRAPER_ENABLED=true`

Graceful shutdown on SIGTERM/SIGINT: stop scheduler, close server, disconnect Prisma (10s timeout).

## Backend Module Map (`server/src/`)

| Module | Purpose |
|---|---|
| `routes/` | Express routers — full inventory below |
| `auth/` | Cookie utilities, JWT session issuing, role checks (`studentSessions`, `roles`) |
| `middleware/` | `requireAuth`, `requireAdmin`, `requireCatalogReviewer`, rate limiting, request-context/IDs |
| `config/` | `env.ts` — loads and validates all environment variables at startup |
| `db/` | Prisma client singleton (the only database access layer) |
| `data/` | Static reference data: universities and majors lists |
| `catalog/` | v3 project catalog: imports `datasets/v3/projects_v3.csv` into `Project` rows with provenance metadata; `ensureV3ProjectCatalog` runs at boot, `importV3Projects` is the CLI seed script |
| `ranking/` | Deterministic rules ranker (`personalized-rules-v4`): ranks catalog projects against a student profile; per-factor personalization scoring and human-readable match reasons; benchmark prediction export |
| `personalization/` | `profile-v1` feature extraction: normalizes saved student profiles (skills, interests, constraints) into ranking-ready features |
| `recommendations/` | `recommendationService` — assembles the top-12 ranked projects for a user |
| `roadmaps/` | Canonical checkpoint plans per project: builder, generated v1 catalog artifact, validation, catalog sync, and `roadmapService` (personalizes checkpoints from profile/preferences, tracks checkpoint progress snapshots) |
| `pilotCatalog/` | Curated pilot catalog: manifest of candidates, eligibility modes (`ALL`/`CANDIDATES`/`READY_ONLY`), review normalization/validation, publish-readiness checks, review service, boot sync |
| `career/` | Career taxonomy (domains, roles, competencies, portfolio signals), project→career mapping validation, pilot mapping sync |
| `submissions/` | Submission pipeline: evidence kinds, requirement inference/normalization, file validation (25MB × 10 files), storage providers (local disk or Cloudflare R2 via S3 SDK), abandoned-draft cleanup |
| `projects/` | Application lifecycle state machine, entitlements (what a user may do with a project), presentation shaping, provenance |
| `ai/` | Optional OpenAI-compatible AI client (defaults to local Ollama; **off by default**, `AI_ENABLED=true` opt-in): prompts + services for recommendations, project review, resume bullets, experience scoring, opportunity parsing |
| `scraping/` | University opportunity scraper: fetch → parse → extract → create draft projects; cron scheduler |
| `telemetry/` | Privacy-sanitized product events and cohort metrics computation |
| `qa/` | Local QA tooling: `resetLocalQa` (creates resettable local admin/student accounts), `pilotReadiness` report |
| `reliability/` | `readinessReport()` powering `GET /api/health/ready` |
| `lib/` | Small shared helpers (e.g. `lockedProjects`) |

## Route Inventory (all 11 routers)

Mounted in `index.ts`; health endpoints are defined inline there.

**System** (inline in `index.ts`): `GET /api/health`, `GET /api/health/live`, `GET /api/health/ready`

**Auth — `auth.routes.ts` → `/api/auth`:** `GET /status` · `POST /sign-up` · `POST /sign-in` · `POST /google` · `POST /sign-out`

**Users — `users.routes.ts` → `/api/users`:** `GET /me` · `POST /me/access-request` · `POST /me/events` (telemetry) · `PUT /onboarding` · `POST /profile-change-request`

**Reference — `majors.routes.ts` → `/api/majors`:** `GET /`

**Projects & roadmaps — `projects.routes.ts` → `/api/projects`:** `GET /` (catalog) · `GET /me` (workspace) · `POST /` (org/admin create) · `PATCH /:projectId/roadmap-preferences` · `PATCH /:projectId/checkpoints/:checkpointId` (complete) · `POST .../view` · `POST .../feedback` · `POST|DELETE /:projectId/apply` · `POST|DELETE /:projectId/save` · `POST /:projectId/submissions` · `GET|PUT /:projectId/submission-draft` · `POST /:projectId/submission-draft/files` · `DELETE /:projectId/submission-draft/items/:itemId`

**Recommendations — `recommendations.routes.ts` → `/api/recommendations`:** `GET /` (deterministic ranked list)

**Submissions — `submissions.routes.ts` → `/api/submissions`:** `GET /:submissionId/items/:itemId/download` (student-owned files)

**Experiences — `experiences.routes.ts` → `/api/experiences`:** `GET /` · `POST /` · `GET|PATCH|DELETE /:experienceId`

**AI (opt-in) — `ai.routes.ts` → `/api/ai`:** `GET|POST /recommendations` · `POST /review/experience/:experienceId` · `GET /review/experience/:experienceId` · `POST /resume-bullets/:experienceId` · `GET|POST /experience-score` · `POST /feedback`

**Waitlist — `waitlist.routes.ts` → `/api/waitlist`:** `POST /`

**Admin — `admin.routes.ts` → `/api/admin`** (all `requireAdmin`): overview & cohorts (`GET /overview`, `GET|POST /cohorts`, `PATCH /cohorts/:cohortId/members/:userId`, `GET /cohorts/:cohortId/metrics`) · users & plans (`GET /users`, `PATCH /users/:userId/plan`) · access requests (`GET /access-requests`, `POST /access-requests/:id/:decision`) · submissions (`GET /submissions`, `POST /submissions/:id/review`, `GET /submissions/:submissionId/items/:itemId/download`, `PUT /projects/:projectId/submission-requirements`) · project moderation (`GET /projects/pending`, `POST /projects/:id/approve`, `POST /projects/:id/reject`, `GET|PUT /projects/:projectId/checkpoint-plan`) · roadmaps & career (`GET /roadmaps`, `GET /career-taxonomy`, `PUT /pilot-catalog/:projectId/career-mapping`) · pilot catalog (`GET /pilot-catalog`, `PUT /pilot-catalog/:projectId/review`, `POST .../publish`, `POST .../hold`, `PUT|DELETE .../assignments/:reviewType`, `PUT /catalog-reviewers/:userId`) · onboarding (`GET /onboarding`, `GET /onboarding-requests`, `POST /onboarding-requests/:id/approve|reject`) · database tools (`GET /database`, `POST /database/:table`, `PATCH|DELETE /database/:table/:id`) · scraper (`POST /scrape/all`, `POST /scrape/:sourceId`, `GET|POST /scrape/sources`)

**Catalog reviewer — `reviewer.routes.ts` → `/api/reviewer`** (`requireCatalogReviewer`): `GET /pilot-catalog` · `PUT /pilot-catalog/:projectId/review`

## Data Flow

```
datasets/v3/projects_v3.csv
   │  catalog/importV3Projects (seed) · ensureV3ProjectCatalog (boot)
   ▼
Project table (catalog/, with provenance)
   │  roadmaps/syncCatalog → canonical checkpoint plans (quarantine invalid)
   │  pilotCatalog/sync → pilot candidates · career/syncPilotMappings → career mappings
   ▼
Student profile (onboarding) ──► personalization/ (profile-v1 features)
   ▼
ranking/ (personalized-rules-v4) ──► recommendations/ (top 12) ──► Dashboard
   ▼
apply/save → applicationLifecycle → personalized roadmap checkpoints (roadmaps/)
   ▼
submission drafts + files (submissions/: local disk or R2)
   ▼
admin/reviewer review (admin.routes, reviewer.routes) → verified / needs revision
   ▼
telemetry/ product events + cohort metrics; experiences/ + ai/ (opt-in) for resume proof
```

## Background / Scheduled Jobs

One cron job (`scraping/scheduler.ts`, node-cron): **daily at 03:00**, scrapes all active university sources and creates draft projects. Runs **only** when `SCRAPER_ENABLED=true` (default off). Manual trigger: `POST /api/admin/scrape/all`.

## Environment Variables

Validated in `server/src/config/env.ts` at startup.

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — | Prisma/Postgres connection (required) |
| `JWT_SECRET` | — | **Required**; ≥32 chars in production |
| `NODE_ENV` | `development` | |
| `PORT` | `4000` | |
| `CLIENT_ORIGIN` | `http://127.0.0.1:5173` | CORS origin |
| `GOOGLE_CLIENT_ID` | `""` | Falls back to `VITE_GOOGLE_CLIENT_ID` |
| `AI_ENABLED` | `false` | Opt-in; production recommendations never use AI |
| `AI_BASE_URL` | `http://localhost:11434/v1` | OpenAI-compatible endpoint (Ollama) |
| `AI_API_KEY` | `ollama` | Dummy for local use |
| `AI_MODEL` / `AI_REASONER_MODEL` | `deepseek-r1:7b` | |
| `SUBMISSION_STORAGE_PROVIDER` | `local` (dev) / `r2` (prod) | |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` | `""` | Required when provider is `r2` |
| `CLAMAV_HOST` / `CLAMAV_PORT` | `""` / `3310` | AV scanning (optional) |
| `PILOT_CATALOG_MODE` | env-dependent | `ALL` \| `CANDIDATES` \| `READY_ONLY` |
| `PILOT_MINIMUM_READY_PROJECTS` | `24` | Integer 1–130 |
| `SCRAPER_ENABLED` | `false` | Enables the daily cron |

**There are no admin credential environment variables.** Admin access is always a normal authenticated database user with `role=ADMIN` (create locally via `npm run qa:reset`).

## Frontend Structure (`src/`)

- `main.tsx` / `App.tsx` — bootstrap and routing (React Router v7)
- `pages/` — `Home`, `SignIn`, `SignUp`, `Onboarding`, `OrganizationOnboarding`, `Dashboard`, `Admin`, `CatalogReviewer`, `About`, `ForStudents`, `ForOrganizations`, plus `pages/app/` (signed-in app screens)
- `components/` — shared UI (incl. `auth/AuthSessionProvider`)
- `hooks/`, `lib/` — client state helpers, API clients (`lib/auth.ts` etc.)
- `styles/` + `styles.css` — global CSS

Auth state comes from server-set httpOnly cookies (`studentSessionCookie` / `adminSessionCookie`); nothing in `localStorage`.

## Testing

All tests run via tsx; `npm test` runs the full suite in sequence. The roadmap suite reads a local database seeded with the included 130-project catalog; run the setup commands in README first.

| Script | Covers |
|---|---|
| `test:submissions` | Submission requirements/evidence logic |
| `test:ranking-service` | Rules ranker output |
| `test:profile-features` | Profile feature normalization |
| `test:project-presentation` | Project presentation shaping |
| `test:catalog-provenance` | v3 catalog import/provenance |
| `test:application-status-ui` | Client-side application status logic |
| `test:ranking-response` | Client-side ranking response handling |
| `test:lifecycle` | Application lifecycle state machine |
| `test:privacy` | Telemetry event sanitization |
| `test:cohort-metrics` | Cohort metrics computation |
| `test:authorization` | Role/permission checks |
| `test:roadmaps` | Roadmap personalization/validation |
| `test:pilot-catalog` | Pilot catalog validation/eligibility |

Other ops scripts: `qa:reset`, `qa:pilot-readiness`, `seed:projects:v3`, `roadmaps:sync`, `roadmaps:catalog:generate`, `pilot-catalog:sync`, `career-mappings:sync`, `backfill:submission-requirements`, `benchmark:predictions`.
