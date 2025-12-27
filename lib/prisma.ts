// lib/prisma.ts

import { PrismaClient } from "@prisma/client";

// Prevent multiple instances in development (hot reload issue)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query", "error", "warn"], // Logs queries in development
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
