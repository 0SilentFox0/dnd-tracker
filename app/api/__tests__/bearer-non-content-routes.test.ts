import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ getSessionUserId: vi.fn(async () => null), getAuthUser: vi.fn(async () => null) }));
vi.mock("@/lib/ai/api-tokens", async (orig) => ({
  ...(await orig<typeof import("@/lib/ai/api-tokens")>()),
  verifyApiToken: vi.fn(async () => ({ campaignId: "c1", userId: "dm", scopes: ["ai", "content:read", "content:write"] })),
}));

import { verifyApiToken } from "@/lib/ai/api-tokens";

type Handler = (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;

const routes: [string, string, string][] = [
  ["battles GET", "@/app/api/campaigns/[id]/battles/route", "GET"],
  ["characters GET", "@/app/api/campaigns/[id]/characters/route", "GET"],
  ["scenario GET", "@/app/api/campaigns/[id]/scenario/route", "GET"],
  ["show GET", "@/app/api/campaigns/[id]/show/route", "GET"],
  ["ai threads GET", "@/app/api/campaigns/[id]/ai/threads/route", "GET"],
  ["tracks upload-url POST", "@/app/api/campaigns/[id]/tracks/upload-url/route", "POST"],
  ["api-tokens GET", "@/app/api/campaigns/[id]/api-tokens/route", "GET"],
];

describe("роути поза контентом не читають Bearer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AI_KEYS_SECRET", randomBytes(32).toString("base64"));
  });

  it.each(routes)("%s лише з валідним токеном — 401, токен не перевіряється", async (_name, path, method) => {
    const handler = (await import(/* @vite-ignore */ path))[method] as Handler;

    const res = await handler(new Request("http://x/api/campaigns/c1", { method, headers: { authorization: "Bearer dndt_x" }, body: method === "POST" ? "{}" : undefined }), {
      params: Promise.resolve({ id: "c1" }),
    });

    expect(res.status).toBe(401);
    expect(verifyApiToken).not.toHaveBeenCalled();
  });
});
