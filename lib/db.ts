import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function withSafePoolLimits(databaseUrl?: string) {
  if (!databaseUrl) {
    return databaseUrl;
  }

  try {
    const parsed = new URL(databaseUrl);

    const isVercel = Boolean(process.env.VERCEL);

    const isDev = process.env.NODE_ENV === "development";

    const isPoolerHost = parsed.hostname.includes("pooler.");

    const isPgBouncerMode = parsed.searchParams.get("pgbouncer") === "true";

    const shouldLimitPool = isVercel || isPoolerHost || isPgBouncerMode;

    if (!shouldLimitPool && !isDev) {
      return databaseUrl;
    }

    // Dev: 10 — refetch + next-turn + інші API паралельно (override env якщо є 5)
    // Vercel/serverless: 1 — avoid max clients errors
    parsed.searchParams.set(
      "connection_limit",
      isDev ? "10" : "1",
    );

    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", isDev ? "20" : "10");
    }

    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url: withSafePoolLimits(process.env.DATABASE_URL),
      },
    },
    // Для Transaction mode (порт 6543) вимикаємо prepared statements
    // Prisma автоматично визначає це, але можна явно вказати
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
