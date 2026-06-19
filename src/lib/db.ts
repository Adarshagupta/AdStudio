import { PrismaClient } from "@prisma/client";

import { resolveDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: { url: resolveDatabaseUrl() },
    },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient() {
  const cached = globalForPrisma.prisma;

  // Hot reload can keep an old Prisma client after schema changes.
  if (
    cached &&
    typeof cached.studioFlow !== "undefined" &&
    typeof cached.blogPost !== "undefined"
  ) {
    return cached;
  }

  if (cached) {
    void cached.$disconnect();
  }

  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

/** Lazy singleton — avoids reading DATABASE_URL before Next.js loads .env */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    if (typeof value === "function") {
      return (value as CallableFunction).bind(client);
    }
    return value;
  },
});
