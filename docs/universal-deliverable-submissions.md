# Universal deliverable submissions

Projects expose normalized `submissionRequirements` with ordered `TEXT`, `FILE`, `IMAGE`, `DOCUMENT`, `REPOSITORY`, or `LINK` evidence requirements. Existing projects without stored JSON receive deterministic requirements inferred from their existing `deliverable` description.

## Student API

- `GET /api/projects/:projectId/submission-draft`
- `PUT /api/projects/:projectId/submission-draft`
- `POST /api/projects/:projectId/submission-draft/files` (multipart, one `file` plus `requirementKey`)
- `DELETE /api/projects/:projectId/submission-draft/items/:itemId`
- `POST /api/projects/:projectId/submissions` finalizes the current draft
- `GET /api/submissions/:submissionId/items/:itemId/download`

Only the application owner can edit a draft or download its files. Finalization requires every saved project checkpoint and every required evidence count. Finalized packages are immutable. A `NEEDS_REVISION` decision allows the student to create a new draft without deleting earlier packages.

Legacy `deliverableUrl` and `notes` fields remain in API responses and older link-only clients can still finalize through the existing endpoint.

## Storage

Development defaults to private files under `.local/submission-uploads`, which is ignored by Git. Production uses a private Cloudflare R2 bucket through its S3-compatible API.

Required production variables:

```text
SUBMISSION_STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

The bucket must not be public. Downloads are authorized by Intrnd and R2 links expire after five minutes. Downloads use attachment disposition; authenticated image previews may request inline disposition. Files are limited to 25 MB each and ten per draft. Executables, scripts, HTML, SVG, archives, macro-enabled Office files, path traversal, and extension/signature mismatches are rejected.

No antivirus claim is made in v1. `SubmissionStorageProvider.scan` is the integration hook for a future malware scanning service.

## Admin

Admin review responses include evidence items and authenticated download routes. Requirements can be corrected with:

`PUT /api/admin/projects/:projectId/submission-requirements`

## Verification

```powershell
npm run test:submissions
npm run build:full
```
