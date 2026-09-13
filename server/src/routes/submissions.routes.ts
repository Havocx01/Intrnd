import { Router } from "express";
import { prisma } from "../db/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { getSubmissionStorage } from "../submissions/storage.js";

const router = Router();

router.get("/:submissionId/items/:itemId/download", requireAuth, async (request, response) => {
  const submissionId = Array.isArray(request.params.submissionId) ? request.params.submissionId[0] : request.params.submissionId;
  const itemId = Array.isArray(request.params.itemId) ? request.params.itemId[0] : request.params.itemId;
  const item = await prisma.submissionItem.findFirst({
    where: { id: itemId, submissionId, submission: { application: { userId: request.user!.id } } },
  });
  if (!item?.storageKey || !item.originalFileName || !item.mimeType) {
    response.status(404).json({ error: "Attachment not found." });
    return;
  }
  const preview = request.query.preview === "1" && item.mimeType.startsWith("image/");
  const disposition = preview ? "inline" : "attachment";
  const result = await getSubmissionStorage().download(item.storageKey, item.originalFileName, item.mimeType, disposition);
  if (result.url) {
    response.redirect(302, result.url);
    return;
  }
  response.setHeader("Content-Type", item.mimeType);
  response.setHeader("Content-Disposition", `${disposition}; filename*=UTF-8''${encodeURIComponent(item.originalFileName)}`);
  response.send(result.buffer);
});

export default router;
