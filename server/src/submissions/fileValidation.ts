import path from "node:path";
import { fileTypeFromBuffer } from "file-type";

export const MAX_SUBMISSION_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_SUBMISSION_FILES = 10;

const allowedExtensions = new Map<string, string[]>([
  [".jpg", ["image/jpeg"]],
  [".jpeg", ["image/jpeg"]],
  [".png", ["image/png"]],
  [".webp", ["image/webp"]],
  [".gif", ["image/gif"]],
  [".pdf", ["application/pdf"]],
  [".docx", ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip"]],
  [".pptx", ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/zip"]],
  [".xlsx", ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip"]],
  [".csv", ["text/csv", "text/plain"]],
  [".txt", ["text/plain"]],
  [".md", ["text/markdown", "text/plain"]],
]);

export type ValidatedUpload = { originalFileName: string; mimeType: string; sizeBytes: number; extension: string };

export async function validateUpload(file: Express.Multer.File): Promise<ValidatedUpload> {
  if (!file.buffer?.length) throw new Error("The uploaded file is empty.");
  if (file.size > MAX_SUBMISSION_FILE_BYTES) throw new Error("Files must be 25 MB or smaller.");

  const originalFileName = sanitizeFilename(file.originalname);
  const extension = path.extname(originalFileName).toLowerCase();
  const expected = allowedExtensions.get(extension);
  if (!expected) throw new Error("That file type is not supported.");

  const detected = await fileTypeFromBuffer(file.buffer);
  let mimeType = detected?.mime ?? normalizeMime(file.mimetype);

  if ([".csv", ".txt", ".md"].includes(extension)) {
    if (file.buffer.includes(0)) throw new Error("The file does not appear to be safe text.");
    mimeType = extension === ".csv" ? "text/csv" : extension === ".md" ? "text/markdown" : "text/plain";
  } else if (!detected || !expected.includes(detected.mime)) {
    throw new Error("The file contents do not match its extension.");
  }

  return { originalFileName, mimeType, sizeBytes: file.size, extension };
}

export function sanitizeFilename(value: string) {
  const base = path
    .basename(value)
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "_")
    .trim();
  return (base || "attachment").slice(0, 180);
}

function normalizeMime(value: string) {
  return value.split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
}
