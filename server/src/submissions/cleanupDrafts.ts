import { prisma } from "../db/prisma.js";
import { getSubmissionStorage } from "./storage.js";

let lastCleanupAt = 0;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export async function cleanupAbandonedSubmissionDrafts() {
  if (Date.now() - lastCleanupAt < 60 * 60 * 1000) return;
  lastCleanupAt = Date.now();
  const drafts = await prisma.submission.findMany({
    where: { status: "DRAFT", updatedAt: { lt: new Date(Date.now() - RETENTION_MS) } },
    include: { items: true },
    take: 100,
  });
  for (const draft of drafts) {
    for (const item of draft.items) {
      if (item.storageKey)
        await getSubmissionStorage()
          .remove(item.storageKey)
          .catch(() => undefined);
    }
    await prisma.submission.delete({ where: { id: draft.id } }).catch(() => undefined);
  }
}
