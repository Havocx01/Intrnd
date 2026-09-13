import { ensureV3ProjectCatalog } from "./v3ProjectCatalog.js";
import { prisma } from "../db/prisma.js";

try {
  const result = await ensureV3ProjectCatalog({ force: process.argv.includes("--force") });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await prisma.$disconnect();
}
