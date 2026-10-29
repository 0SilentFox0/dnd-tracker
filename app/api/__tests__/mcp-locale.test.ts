import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/mcp/route";

const h = vi.hoisted(() => ({ ctx: null as null | { locale: string; caller?: { locale: string } }, profile: "uk" as string | null }));

vi.mock("@/lib/ai/api-tokens", () => ({ verifyApiToken: vi.fn(async () => ({ id: "t1", campaignId: "c1", userId: "dm", scopes: ["content:read"], locale: h.profile ?? "en" })) }));
vi.mock("@/lib/ai/tools", () => ({
  toolsFor: () => [{ name: "x" }],
  registerMcpTools: (_server: unknown, _tools: unknown, ctx: NonNullable<typeof h.ctx>) => { h.ctx = ctx; },
}));
vi.mock("@/lib/ai/mcp-request", () => ({ boundMcpRequest: async (req: Request) => req }));
vi.mock("mcp-handler", () => ({
  createMcpHandler: (init: (server: unknown) => void) => async () => { init({});

 return new Response("{}"); },
}));
vi.mock("@/lib/utils/api/rate-limit", () => ({ checkRateLimit: async () => ({ allowed: true }), rateLimitResponse: () => new Response(null, { status: 429 }) }));

const request = (headers: Record<string, string> = {}) => new Request("http://x/api/mcp", { headers: { authorization: "Bearer dndt_abc", ...headers } });

describe("MCP locale", () => {
  beforeEach(() => { h.ctx = null; h.profile = "uk"; });

  it("without cookie and Accept-Language the token owner's profile locale is used", async () => {
    await GET(request());

    expect(h.ctx).toMatchObject({ locale: "uk", caller: { locale: "uk" } });
  });

  it("profile fallback is en", async () => {
    h.profile = null;
    await GET(request());

    expect(h.ctx?.locale).toBe("en");
  });

  it("Accept-Language beats the profile", async () => {
    await GET(request({ "accept-language": "en-US,en;q=0.9" }));

    expect(h.ctx).toMatchObject({ locale: "en", caller: { locale: "en" } });
  });

  it("the NEXT_LOCALE cookie beats the profile", async () => {
    h.profile = "en";
    await GET(request({ cookie: "a=b; NEXT_LOCALE=uk" }));

    expect(h.ctx?.locale).toBe("uk");
  });
});
