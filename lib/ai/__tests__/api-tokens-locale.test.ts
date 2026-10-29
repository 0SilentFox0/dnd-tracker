import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyApiToken } from "../api-tokens";

const db = vi.hoisted(() => ({ locale: null as string | null | undefined }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  prisma: {
    apiToken: { findUnique: async () => ({ id: "t", campaignId: "c", userId: "u", revokedAt: null, scopes: [] }), updateMany: async () => ({ count: 1 }) },
    campaignMember: { findMany: async () => [{ role: "dm" }] },
    user: { findUnique: async () => (db.locale === undefined ? null : { locale: db.locale }) },
  },
}));

describe("verifyApiToken locale", () => {
  beforeEach(() => { db.locale = null; });

  it.each([["uk", "uk"], ["en", "en"], ["fr", "en"], [null, "en"], [undefined, "en"]])("owner locale %s -> %s", async (stored, expected) => {
    db.locale = stored;

    expect((await verifyApiToken("dndt_x"))?.locale).toBe(expected);
  });
});
