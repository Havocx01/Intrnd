import { prisma } from "../db/prisma.js";
import { Prisma } from "@prisma/client";
import { inferSubmissionRequirements } from "./requirements.js";

const projects = await prisma.project.findMany({
  where: { submissionRequirements: { equals: Prisma.DbNull } },
  select: { id: true, deliverable: true },
});

for (const project of projects) {
  await prisma.project.update({
    where: { id: project.id },
    data: { submissionRequirements: inferSubmissionRequirements(project.deliverable) },
  });
}

console.log(`Backfilled submission requirements for ${projects.length} projects.`);
await prisma.$disconnect();
