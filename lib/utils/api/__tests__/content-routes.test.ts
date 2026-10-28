import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";

vi.mock("@/lib/db", async () => {
  const { contentDatabaseDouble } = await import("@/lib/server/content/__tests__/database-double");

  return { prisma: contentDatabaseDouble({}) };
});
vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/api-tokens", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/api-tokens")>()), verifyApiToken: vi.fn() }));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn() }));
vi.mock("@/lib/utils/api/api-auth", () => ({
  requireDM: vi.fn(async () => ({ userId: "dm" })),
  requireCampaignAccess: vi.fn(async () => ({ userId: "p", isDM: false })),
}));

import { verifyApiToken } from "@/lib/ai/api-tokens";
import { defineResource } from "@/lib/server/content/define-resource";
import { ContentError } from "@/lib/server/content/errors";
import * as apiAuth from "@/lib/utils/api/api-auth";
import { collectionRoutes, itemRoutes } from "@/lib/utils/api/content-routes";

const created = vi.fn(async (_a: unknown, input: { name: string }) => ({ id: "n1", campaignId: "c1", ...input }));

const thing = defineResource<{ id: string; campaignId: string }, { name: string }, { name?: string }>({
  kind: "units",
  listFields: [],
  idParam: "thingId",
  label: "Тест",
  description: "",
  path: "/things",
  schemas: { create: z.object({ name: z.string().min(1) }), update: z.object({ name: z.string().optional() }) },
  access: { list: "member", item: "dm" },
  invalidates: [],
  notFound: "Немає",
  list: async () => [{ id: "a" }],
  find: async (actor, id) => (id === "a" ? { id, campaignId: actor.campaignId } : null),
  create: created,
  update: async (_a, existing, input) => ({ ...existing, ...input }),
  remove: async () => {
    throw new ContentError("Зайнято", 409);
  },
});

const col = collectionRoutes(thing);

const one = itemRoutes(thing);

const ctx = { params: Promise.resolve({ id: "c1" }) };

const ctxOne = (thingId: string) => ({ params: Promise.resolve({ id: "c1", thingId }) });

const req = (method: string, body?: string) => new Request("http://x/api/campaigns/c1/things", { method, ...(body !== undefined && { body }) });

const bearer = (method: string, body?: string) => new Request("http://x/api/campaigns/c1/things", { method, headers: { authorization: "Bearer dndt_x" }, ...(body !== undefined && { body }) });

const scopes = (s: string[]) => vi.mocked(verifyApiToken).mockResolvedValue({ campaignId: "c1", userId: "dm", scopes: s } as never);

const json = async (res: Response) => ({ status: res.status, body: await res.json() });

describe("content routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET списку — доступ учасника, private no-store", async () => {
    const res = await col.GET(req("GET"), ctx);

    expect(apiAuth.requireCampaignAccess).toHaveBeenCalledWith("c1", false);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await res.json()).toEqual([{ id: "a" }]);
  });

  it("GET запису з access.item = dm вимагає ДМ", async () => {
    await one.GET(req("GET"), ctxOne("a"));
    expect(apiAuth.requireDM).toHaveBeenCalledWith("c1");
  });

  it("відмова доступу повертається як є", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValueOnce(NextResponse.json({ error: "x" }, { status: 403 }) as never);
    expect((await col.POST(req("POST", '{"name":"А"}'), ctx)).status).toBe(403);
    expect(created).not.toHaveBeenCalled();
  });

  it("POST → 201 із записом", async () => {
    expect(await json(await col.POST(req("POST", '{"name":"А"}'), ctx))).toEqual({ status: 201, body: { id: "n1", campaignId: "c1", name: "А" } });
  });

  it("некоректний або порожній JSON → 400 INVALID_JSON", async () => {
    for (const body of ["{", ""]) {
      const res = await json(await col.POST(req("POST", body), ctx));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(API_ERRORS.INVALID_JSON);
    }
  });

  it("невалідне тіло → 400 з issues", async () => {
    const res = await json(await col.POST(req("POST", '{"name":""}'), ctx));

    expect(res.status).toBe(400);
    expect(res.body.issues).toBeDefined();
  });

  it("PATCH відсутнього → 404 з повідомленням ресурсу", async () => {
    expect(await json(await one.PATCH(req("PATCH", "{}"), ctxOne("zzz")))).toMatchObject({ status: 404, body: { error: "Немає" } });
  });

  it("ContentError із хука → його статус і текст", async () => {
    expect(await json(await one.DELETE(req("DELETE"), ctxOne("a")))).toMatchObject({ status: 409, body: { error: "Зайнято" } });
  });

  it("DELETE колекції без removeAll → 405", async () => {
    expect((await col.DELETE(req("DELETE"), ctx)).status).toBe(405);
  });

  it("токен content:read читає список і запис, але не пише", async () => {
    scopes(["content:read"]);
    expect((await col.GET(bearer("GET"), ctx)).status).toBe(200);
    expect((await one.GET(bearer("GET"), ctxOne("a"))).status).toBe(200);
    expect((await col.POST(bearer("POST", '{"name":"А"}'), ctx)).status).toBe(403);
    expect((await one.PATCH(bearer("PATCH", '{"name":"Б"}'), ctxOne("a"))).status).toBe(403);
    expect(created).not.toHaveBeenCalled();
  });

  it("токен content:write створює", async () => {
    scopes(["content:write"]);
    expect((await col.POST(bearer("POST", '{"name":"А"}'), ctx)).status).toBe(201);
  });

  it("видалити всі через токен — 403 навіть із content:write", async () => {
    scopes(["content:write"]);
    expect((await col.DELETE(bearer("DELETE"), ctx)).status).toBe(403);
  });
});
