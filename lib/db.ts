import { PrismaClient } from "@prisma/client";

import { contentLayer } from "@/lib/db/content-layer";
import { createScopedDatabase } from "@/lib/server/content/write-context";

/**
 * Supabase pooler (рекомендовано для serverless/Vercel):
 * - Host: pooler.supabase.co (або aws-*-*.pooler.supabase.com)
 * - Port: 6543 (Transaction mode)
 * - Query: ?pgbouncer=true
 * Приклад: postgresql://postgres.[REF]:[PWD]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const VERCEL_CONNECTION_LIMIT = 5;

const DEV_CONNECTION_LIMIT = 10;

type PoolEnv = Partial<Pick<NodeJS.ProcessEnv, "VERCEL" | "NODE_ENV" | "PRISMA_CONNECTION_LIMIT">>;

export function withSafePoolLimits(databaseUrl?: string, env: PoolEnv = process.env) {
  if (!databaseUrl) {
    return databaseUrl;
  }

  try {
    const parsed = new URL(databaseUrl);

    const isDev = env.NODE_ENV === "development" && !env.VERCEL;

    const isPooled =
      Boolean(env.VERCEL) || parsed.hostname.includes("pooler.") || parsed.searchParams.get("pgbouncer") === "true";

    if (!isPooled && !isDev) {
      return databaseUrl;
    }

    const override = Number.parseInt(env.PRISMA_CONNECTION_LIMIT ?? "", 10);

    const limit = override > 0 ? override : isDev ? DEV_CONNECTION_LIMIT : VERCEL_CONNECTION_LIMIT;

    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", String(limit));
    }

    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", isDev ? "20" : "10");
    }

    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

const basePrisma =
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

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

export const prisma = createScopedDatabase(basePrisma.$extends(contentLayer()) as unknown as PrismaClient);
