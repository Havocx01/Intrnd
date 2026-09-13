import { PrismaClient } from "@prisma/client";

// Reuse one client per API process.
export const prisma = new PrismaClient();
