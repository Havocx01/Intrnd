# Deployment

Intrnd is archived for portfolio review. Local evaluation is the supported use of this snapshot. Publishing the repository does not deploy the application.

The included `render.yaml` is an infrastructure template, not a working public deployment. It requires your own database, domain, private object storage, and malware scanner. Check the host's current pricing and limits before using it.

## Build and start

```bash
npm ci --include=dev
npm run prisma:generate
npm run build:full
npm run db:deploy
npm start
```

The Express server serves `dist/`, API routes, and frontend route fallbacks. Production uses the compiled API in `dist-server/`.

## Required configuration

- `NODE_ENV=production`.
- `DATABASE_URL`: your PostgreSQL connection string.
- `JWT_SECRET`: a randomly generated secret of at least 32 characters, not a local example.
- `CLIENT_ORIGIN`: your HTTPS frontend origin.
- `PORT`: the port assigned by your host.
- `SUBMISSION_STORAGE_PROVIDER=r2`, plus `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` for private evidence storage.
- `CLAMAV_HOST` and `CLAMAV_PORT`: a reachable malware scanner for uploads.
- `PILOT_CATALOG_MODE=READY_ONLY` and `PILOT_MINIMUM_READY_PROJECTS=24`.

Set Google OAuth IDs only if you configure your own client and authorized origins. Scraping and optional model-backed endpoints remain disabled unless explicitly enabled.

Add a domain you control to the host, configure its DNS and HTTPS, and set the matching `CLIENT_ORIGIN`. The template does not attach the original project's domains.

## Readiness

`/api/health/live` checks that the process is running. `/api/health/ready` checks the database, storage/scanner configuration, and catalog readiness.

Fresh imports are practice-project candidates, not approved live opportunities. Production readiness requires enough reviewed, publishable projects; importing CSV data alone does not satisfy the threshold. Complete the review workflow instead of bypassing that check. Do not copy local QA accounts into a public database.

Before inviting users, complete password recovery, privacy/terms pages, security review, backups and recovery testing, and end-to-end checks against the actual storage, scanner, and OAuth services. Those external integrations are not supplied with this source archive.
