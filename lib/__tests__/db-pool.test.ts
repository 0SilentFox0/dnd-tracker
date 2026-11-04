import { describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", async (importOriginal) => ({ ...(await importOriginal<typeof import("@prisma/client")>()), PrismaClient: class { $extends() { return this; } } }));
vi.mock("@/lib/server/content/write-context", () => ({ createScopedDatabase: (db: unknown) => db }));

import { withSafePoolLimits } from "../db";

const POOLER = "postgresql://u:p@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true";

const DIRECT = "postgresql://u:p@db.example.supabase.co:5432/postgres";

const params = (url?: string) => new URL(url as string).searchParams;

describe("withSafePoolLimits", () => {
  it("returns undefined for a missing url", () => {
    expect(withSafePoolLimits(undefined, {})).toBeUndefined();
  });

  it("uses 5 connections and a 10s pool timeout on Vercel", () => {
    const p = params(withSafePoolLimits(POOLER, { VERCEL: "1" }));

    expect(p.get("connection_limit")).toBe("5");
    expect(p.get("pool_timeout")).toBe("10");
  });

  it("honours PRISMA_CONNECTION_LIMIT", () => {
    const p = params(withSafePoolLimits(POOLER, { VERCEL: "1", PRISMA_CONNECTION_LIMIT: "8" }));

    expect(p.get("connection_limit")).toBe("8");
  });

  it("ignores an invalid PRISMA_CONNECTION_LIMIT", () => {
    const p = params(withSafePoolLimits(POOLER, { VERCEL: "1", PRISMA_CONNECTION_LIMIT: "abc" }));

    expect(p.get("connection_limit")).toBe("5");
  });

  it("uses 10 connections in dev", () => {
    const p = params(withSafePoolLimits(DIRECT, { NODE_ENV: "development" }));

    expect(p.get("connection_limit")).toBe("10");
  });

  it("returns a non-pooler url unchanged outside Vercel", () => {
    expect(withSafePoolLimits(DIRECT, { NODE_ENV: "production" })).toBe(DIRECT);
  });

  it("limits a pooler url outside Vercel", () => {
    const p = params(withSafePoolLimits(POOLER, { NODE_ENV: "production" }));

    expect(p.get("connection_limit")).toBe("5");
  });

  it("does not overwrite parameters already in the url", () => {
    const p = params(withSafePoolLimits(`${POOLER}&connection_limit=3&pool_timeout=30`, { VERCEL: "1", PRISMA_CONNECTION_LIMIT: "8" }));

    expect(p.get("connection_limit")).toBe("3");
    expect(p.get("pool_timeout")).toBe("30");
  });

  it("returns an unparsable url unchanged", () => {
    expect(withSafePoolLimits("not a url", { VERCEL: "1" })).toBe("not a url");
  });
});
