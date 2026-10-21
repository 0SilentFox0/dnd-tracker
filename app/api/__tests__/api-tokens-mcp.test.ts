import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashToken } from "@/lib/ai/api-tokens";
import { prisma } from "@/lib/db";

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
      lastUsedAt: null,
      createdAt: new Date(),
    })) as never);

    const { createApiToken } = await import("@/lib/ai/api-tokens");

    const created = await createApiToken("camp1", "dm", "Claude Desktop");

    expect(created.token).toMatch(/^dndt_/);

    const data = vi.mocked(prisma.apiToken.create).mock.calls[0][0].data as Record<string, unknown>;

    expect(data.tokenHash).toBe(hashToken(created.token));
    expect(JSON.stringify(data)).not.toContain(created.token);
  });

  it("MCP без токена — 401", async () => {
    const { POST } = await import("@/app/api/mcp/route");

    expect((await POST(mcpReq())).status).toBe(401);
  });

  it("відкликаний токен — 401", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: new Date(), lastUsedAt: null } as never);

    const { POST } = await import("@/app/api/mcp/route");

    expect((await POST(mcpReq("dndt_abc"))).status).toBe(401);
  });

  it("власник більше не ДМ — 401", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: null } as never);
    vi.mocked(prisma.campaignMember.findMany).mockResolvedValue([{ userId: "dm", role: "player" }] as never);

    const { POST } = await import("@/app/api/mcp/route");

    expect((await POST(mcpReq("dndt_abc"))).status).toBe(401);
  });

  it("валідний токен — tools/list містить інструменти реєстру", async () => {
    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({ id: "k1", campaignId: "camp1", userId: "dm", revokedAt: null, lastUsedAt: new Date() } as never);

    const { POST } = await import("@/app/api/mcp/route");

    const res = await POST(mcpReq("dndt_abc"));

    expect(res.status).toBe(200);
    expect(await res.text()).toContain("read_scenario_page");
  });
});
