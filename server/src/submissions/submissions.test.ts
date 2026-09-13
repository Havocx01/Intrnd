import assert from "node:assert/strict";
import { inferSubmissionRequirements, isHttpsUrl, isRepositoryUrl, normalizeSubmissionRequirements } from "./requirements.js";
import { validateUpload } from "./fileValidation.js";

const repository = inferSubmissionRequirements("GitHub repo with README and live demo");
assert.equal(
  repository.items.some((item) => item.kind === "REPOSITORY"),
  true,
);
assert.equal(
  repository.items.some((item) => item.kind === "LINK"),
  true,
);
const demoVideo = inferSubmissionRequirements("GitHub repo with README and demo video");
assert.equal(demoVideo.items.find((item) => item.kind === "LINK")?.title, "Demo video link");

const document = inferSubmissionRequirements("PDF report and screenshot deck");
assert.equal(
  document.items.some((item) => item.kind === "DOCUMENT"),
  true,
);
assert.equal(
  document.items.some((item) => item.kind === "IMAGE"),
  true,
);

const normalized = normalizeSubmissionRequirements(
  {
    version: 1,
    items: [
      { key: " final report ", title: "Report", instructions: "Upload it", kind: "DOCUMENT", required: true, minItems: 1, maxItems: 2 },
    ],
  },
  null,
);
assert.equal(normalized.items[0]?.key, "final-report");
assert.equal(normalized.items[0]?.maxItems, 2);

assert.equal(isHttpsUrl("https://example.com/work"), true);
assert.equal(isHttpsUrl("http://example.com/work"), false);
assert.equal(isRepositoryUrl("https://github.com/student/project"), true);
assert.equal(isRepositoryUrl("https://github.com/student"), false);
assert.equal(isRepositoryUrl("https://example.com/student/project"), false);

const pdfBuffer = Buffer.from("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n", "utf8");
const pdf = await validateUpload({
  originalname: "report.pdf",
  mimetype: "application/pdf",
  size: pdfBuffer.length,
  buffer: pdfBuffer,
} as Express.Multer.File);
assert.equal(pdf.mimeType, "application/pdf");

await assert.rejects(
  () =>
    validateUpload({
      originalname: "malware.exe",
      mimetype: "application/octet-stream",
      size: 4,
      buffer: Buffer.from("MZxx"),
    } as Express.Multer.File),
  /not supported/,
);
await assert.rejects(
  () =>
    validateUpload({
      originalname: "renamed.pdf",
      mimetype: "application/pdf",
      size: 4,
      buffer: Buffer.from("MZxx"),
    } as Express.Multer.File),
  /do not match/,
);

console.log("Submission requirement and upload validation tests passed.");
