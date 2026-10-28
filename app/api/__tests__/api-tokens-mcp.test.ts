import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashToken } from "@/lib/ai/api-tokens";
import { prisma } from "@/lib/db";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));

vi.mock("@/lib/db", () => ({
  prisma: {
    apiToken: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    campaignMember: { findMany: vi.fn() },
  },
}));

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
    const { POST } = await import("@/app/api/mcp/route");

    expect((await POST(mcpReq())).status).toBe(401);
  });

  it("відкликаний токен — 401", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: new Date(), lastUsedAt: null, scopes: ["ai"] } as never);

    const { POST } = await import("@/app/api/mcp/route");

    expect((await POST(mcpReq("dndt_abc"))).status).toBe(401);
  });

  it("власник більше не ДМ — 401", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: null, scopes: ["ai"] } as never);
    vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([{ userId: "dm", role: "player" }] as never);

    const { POST } = await import("@/app/api/mcp/route");

    expect((await POST(mcpReq("dndt_abc"))).status).toBe(401);
  });

  it("валідний токен — tools/list містить інструменти реєстру", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: new Date(), scopes: ["ai"] } as never);

    const { POST } = await import("@/app/api/mcp/route");

    const res = await POST(mcpReq("dndt_abc"));

    expect(res.status).toBe(200);
    expect(await res.text()).toContain("read_scenario_page");
  });

  it("verifyApiToken повертає scopes і відкидає невідомі", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: new Date(), scopes: ["content:write", "junk"] } as never);

    const { verifyApiToken } = await import("@/lib/ai/api-tokens");

    expect(await verifyApiToken("dndt_abc")).toEqual({ campaignId: "camp1", userId: "dm", scopes: ["content:write"] });
  });

  it("токен без права ai на MCP — 403", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: new Date(), scopes: ["content:write"] } as never);

    const { POST } = await import("@/app/api/mcp/route");

    expect((await POST(mcpReq("dndt_abc"))).status).toBe(403);
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
