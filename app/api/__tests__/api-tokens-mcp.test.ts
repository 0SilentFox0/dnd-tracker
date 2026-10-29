import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/mcp/route";
import { hashToken } from "@/lib/ai/api-tokens";
import { prisma } from "@/lib/db";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/cache/tags", () => ({ invalidateReference: vi.fn() }));

const things = vi.hoisted(() => new Map<string, Record<string, unknown>>());

vi.mock("@/lib/server/content/resources", async () => {
  const { z } = await import("zod");

  const { API_ERRORS } = await import("@/lib/constants/api-errors");

  const { defineResource } = await import("@/lib/server/content/define-resource");

  const unit = defineResource<Record<string, unknown>, { name: string }, { name?: string }>({
    kind: "units",
    listFields: ["level"],
    idParam: "unitId",
    label: "Юніти",
    description: "Тест",
    path: "/units",
    schemas: { create: z.object({ name: z.string().min(2) }), update: z.object({ name: z.string().min(2).optional() }) },
    access: { list: "member", item: "member" },
    invalidates: [],
    notFound: API_ERRORS.BATTLE_UNIT_NOT_FOUND,
    list: async () => [...things.values()],
    find: async (actor, id) => {
      const row = things.get(id);

      return row && row.campaignId === actor.campaignId ? row : null;
    },
    create: async (actor, input) => {
      const row = { id: `n${things.size + 1}`, campaignId: actor.campaignId, ...input };

      things.set(row.id, row);

      return row;
    },
    update: async (_a, existing, input) => {
      const row = { ...existing, ...input };

      things.set(existing.id as string, row);

      return row;
    },
    remove: async (_a, existing) => {
      things.delete(existing.id as string);
    },
  });

  return { CONTENT_RESOURCES: { units: unit } };
});

vi.mock("@/lib/server/assistant/actions/content-preview", () => ({ contentPreviewState: async () => ({ tables: {}, characters: [] }), contentOperationState: async () => null }));
vi.mock("@/lib/server/assistant/actions/content-snapshot", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/server/assistant/actions/content-snapshot")>(),
  contentSnapshot: async () => ({ tables: {}, characters: [] }),
}));
vi.mock("@/lib/db", async () => {
  const { contentDatabaseDouble } = await import("@/lib/server/content/__tests__/database-double");

  return { prisma: contentDatabaseDouble({
    apiToken: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    campaignMember: { findMany: vi.fn() },
    user: { findUnique: vi.fn(async () => ({ locale: "uk" as const })) },
    assistantReceipt: { findFirst: vi.fn(async () => null) },
    assistantIntent: { upsert: vi.fn(async ({ create }) => ({ id: "intent", ...create, createdAt: new Date(), expiresAt: new Date(Date.now() + 900000) })) },
  }) };
});

const rpc = (method: string, id: number, params: unknown = {}, token?: string) =>
  new Request("http://x/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...(token && { authorization: `Bearer ${token}` }) },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });

const mcpReq = (token?: string) => rpc("tools/list", 1, {}, token);

describe("API tokens + MCP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([{ userId: "dm", role: "dm" }] as never);
  });

  it("створення: у БД лише хеш, токен з префіксом повертається один раз", async () => {
    vi.mocked(prisma.apiToken.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => ({
      id: "k1",
      name: data.name,
      prefix: data.prefix,
      scopes: data.scopes,
      lastUsedAt: null,
      createdAt: new Date(),
    })) as never);

    const { createApiToken } = await import("@/lib/ai/api-tokens");

    const created = await createApiToken("camp1", "dm", { name: "Claude Desktop", scopes: ["content:read"] });

    expect(created.token).toMatch(/^dndt_/);

    const data = vi.mocked(prisma.apiToken.create).mock.calls[0][0].data as Record<string, unknown>;

    expect(data.tokenHash).toBe(hashToken(created.token));
    expect(JSON.stringify(data)).not.toContain(created.token);
    expect(data.scopes).toEqual(["content:read"]);
  });

  it("MCP без токена — 401", async () => {

    expect((await POST(mcpReq())).status).toBe(401);
  });

  it("відкликаний токен — 401", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: new Date(), lastUsedAt: null, scopes: ["ai"] } as never);

    expect((await POST(mcpReq("dndt_abc"))).status).toBe(401);
  });

  it("власник більше не ДМ — 401", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: null, scopes: ["ai"] } as never);
    vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([{ userId: "dm", role: "player" }] as never);

    expect((await POST(mcpReq("dndt_abc"))).status).toBe(401);
  });

  it("валідний токен — tools/list містить інструменти реєстру", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: new Date(), scopes: ["ai"] } as never);

    const res = await POST(mcpReq("dndt_abc"));

    expect(res.status).toBe(200);
    expect(await res.text()).toContain("read_scenario_page");
  });

  it("rejects an oversized declared MCP body before parsing it", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, scopes: ["ai"] } as never);

    const request = mcpReq("dndt_abc");

    request.headers.set("content-length", "4194305");

    expect((await POST(request)).status).toBe(413);
  });

  it("bounds a headerless MCP stream before the wrapper can preparse JSON", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, scopes: ["ai"] } as never);

    let pulls = 0;

    let cancelled = false;

    const stream = new ReadableStream<Uint8Array>({ pull(controller) {
      pulls += 1;

      if (pulls === 1) controller.enqueue(new TextEncoder().encode('{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"padding":"'));
      else if (pulls < 12) controller.enqueue(new TextEncoder().encode("x".repeat(1024 * 1024)));
      else { controller.enqueue(new TextEncoder().encode('"}}')); controller.close(); }
    }, cancel() { cancelled = true; } });

    const request = new Request("http://x/api/mcp", {
      method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: "Bearer dndt_abc" },
      body: stream, duplex: "half",
    } as RequestInit & { duplex: "half" });

    const response = await POST(request);

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ jsonrpc: "2.0", error: { code: -32000 }, id: null });
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThan(12);
  });

  it("preserves valid JSON-RPC at the SDK byte limit and counts UTF-8 bytes", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, scopes: ["ai"] } as never);

    const prefix = '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"padding":"';

    const suffix = '"}}';

    const padding = 4 * 1024 * 1024 - prefix.length - suffix.length;

    const request = (text: string) => new Request("http://x/api/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: "Bearer dndt_abc" }, body: text });

    expect((await POST(request(prefix + "x".repeat(padding) + suffix))).status).toBe(200);
    expect((await POST(request(prefix + "я".repeat(padding) + suffix))).status).toBe(413);
    expect((await POST(request("{invalid"))).status).toBe(400);
  });

  it("verifyApiToken повертає scopes і відкидає невідомі", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: new Date(), scopes: ["content:write", "junk"] } as never);

    const { verifyApiToken } = await import("@/lib/ai/api-tokens");

    expect(await verifyApiToken("dndt_abc")).toEqual({ id: "k1", campaignId: "camp1", userId: "dm", scopes: ["content:write"], locale: "uk" as const });
  });

  it("verifyApiToken: мова власника без профілю — en", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: new Date(), scopes: ["content:write"] } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ locale: null } as never);

    const { verifyApiToken } = await import("@/lib/ai/api-tokens");

    expect(await verifyApiToken("dndt_abc")).toMatchObject({ locale: "en" });
  });

  it("токен без права ai на MCP — 200, ai-інструментів немає", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: new Date(), scopes: ["content:write"] } as never);

    const res = await POST(mcpReq("dndt_abc"));

    expect(res.status).toBe(200);
    expect(await res.text()).not.toContain("search_reference");
  });

  describe("content tools over MCP", () => {
    const asToken = (scopes: string[]) =>
      vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: new Date(), executionMode: "review", scopes } as never);

    const toolNames = async (scopes: string[]) => {
      asToken(scopes);

      const text = await (await POST(rpc("tools/list", 1, {}, "dndt_abc"))).text();

      return [...text.matchAll(/"name":"([a-z_]+)"/g)].map((m) => m[1]);
    };

    const call = async (name: string, args: unknown) => {

      const text = await (await POST(rpc("tools/call", 2, { name, arguments: args }, "dndt_abc"))).text();

      const data = text.split("\n").find((l) => l.startsWith("data:")) ?? text;

      return (JSON.parse(data.replace(/^data:\s*/, "")) as { result: { content: Array<{ text: string }> } }).result.content[0].text;
    };

    beforeEach(() => things.clear());

    it("content:read — читальні інструменти без write і ai", async () => {
      const names = await toolNames(["content:read"]);

      expect(names).toEqual(expect.arrayContaining(["content_list", "content_get", "content_schema", "content_kinds", "get_rules", "get_skill_tree"]));
      expect(names).not.toContain("content_create");
      expect(names).not.toContain("search_reference");
    });

    it("content:write — плюс запис", async () => {
      const names = await toolNames(["content:write"]);

      expect(names).toEqual(expect.arrayContaining(["content_create", "content_update", "content_delete", "update_rules", "save_skill_tree", "content_list"]));
    });

    it("ai — без content_*", async () => {
      expect((await toolNames(["ai"])).filter((n) => n.startsWith("content_"))).toEqual([]);
    });

    it("токен без жодного відомого права → 403, не порожній сервер", async () => {
      asToken(["legacy:unknown"]);

      expect((await POST(rpc("tools/list", 1, {}, "dndt_abc"))).status).toBe(403);
    });

    it("create/update/delete return pending and cannot mutate around review", async () => {
      asToken(["content:write"]);
      things.set("u1", { id: "u1", campaignId: "camp1", name: "Гоблін" });

      const read = JSON.parse(await call("content_get", { kind: "units", id: "u1" }));

      expect(read.data.result.data.name).toBe("Гоблін");
      for (const [name, args] of [["content_create", { kind: "units", data: { name: "Новий" } }], ["content_update", { kind: "units", id: "u1", patch: { name: "Орк" } }], ["content_delete", { kind: "units", id: "u1" }]] as const) {
        const output = JSON.parse(await call(name, args));

        expect(output).toMatchObject({ version: 2, kind: "result", data: { kind: "pending", intent: { status: "pending" } } });
      }
      expect(prisma.assistantIntent.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ originTokenId: "k1", tokenId: "k1", channel: "mcp" }) }));
      expect(things.size).toBe(1);
      expect(things.get("u1")?.name).toBe("Гоблін");
    });

    it("POST повертається лише після виконання інструмента (інакше revalidateTag губиться)", async () => {
      asToken(["content:write"]);

      await POST(rpc("tools/call", 2, { name: "content_create", arguments: { kind: "units", data: { name: "Гоблін" } } }, "dndt_abc"));

      expect(things.size).toBe(0);
      expect(prisma.assistantIntent.upsert).toHaveBeenCalled();
    });

    it("невалідні дані → текст зі шляхом поля", async () => {
      asToken(["content:write"]);

      expect(await call("content_create", { kind: "units", data: { name: "" } })).toContain("name");
    });
  });

  it("bearerToken: немає заголовка → null, інший формат → порожній рядок", async () => {
    const { bearerToken } = await import("@/lib/utils/api/bearer");

    expect(bearerToken(new Request("http://x"))).toBeNull();
    expect(bearerToken(new Request("http://x", { headers: { authorization: "Bearer  dndt_x " } }))).toBe("dndt_x");
    expect(bearerToken(new Request("http://x", { headers: { authorization: "Basic abc" } }))).toBe("");
  });

  describe("POST /api-tokens", () => {
    const post = async (body: unknown, kind = "campaign") => {
      const apiAuth = await import("@/lib/utils/api/api-auth");

      vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "dm", isDM: true, campaign: { id: "camp1", kind } } as never);
      vi.mocked(prisma.apiToken.create).mockImplementation((async ({ data }: { data: Record<string, unknown> }) => ({ id: "k1", name: data.name, prefix: data.prefix, scopes: data.scopes, lastUsedAt: null, createdAt: new Date() })) as never);

      const { POST } = await import("@/app/api/campaigns/[id]/api-tokens/route");

      return POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "camp1" }) });
    };

    it("без прав — 400", async () => {
      expect((await post({ name: "X", scopes: [] })).status).toBe(400);
    });

    it("право ai на шаблоні — 400", async () => {
      expect((await post({ name: "X", scopes: ["ai", "content:read"] }, "template")).status).toBe(400);
    });

    it("content:* на шаблоні — 201 з правами в відповіді", async () => {
      const res = await post({ name: "X", scopes: ["content:write", "content:write"] }, "template");

      expect(res.status).toBe(201);
      expect((await res.json()).scopes).toEqual(["content:write"]);
    });
  });
});
