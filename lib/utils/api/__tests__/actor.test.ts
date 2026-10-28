import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/api-tokens", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/api-tokens")>()), verifyApiToken: vi.fn() }));
vi.mock("@/lib/utils/api/api-auth", () => ({
  requireDM: vi.fn(async () => ({ userId: "dm", isDM: true })),
  requireCampaignAccess: vi.fn(async () => ({ userId: "p", isDM: false })),
}));

import { verifyApiToken } from "@/lib/ai/api-tokens";
import { resolveActor } from "@/lib/utils/api/actor";
import * as apiAuth from "@/lib/utils/api/api-auth";

const withBearer = (value: string) => new Request("http://x", { headers: { authorization: value, cookie: "sb=session" } });

const token = (scopes: string[], campaignId = "c1") => vi.mocked(verifyApiToken).mockResolvedValue({ campaignId, userId: "dm", scopes } as never);

const status = (r: unknown) => (r instanceof NextResponse ? r.status : 200);

describe("resolveActor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("без заголовка — сесія учасника", async () => {
    expect(await resolveActor(new Request("http://x"), "c1", { access: "member", scope: "content:read" })).toEqual({ campaignId: "c1", userId: "p", isDM: false, via: "session", scopes: null });
    expect(verifyApiToken).not.toHaveBeenCalled();
  });

  it("токен з правом — актор ДМ через токен, cookie не читається", async () => {
    token(["content:write"]);
    expect(await resolveActor(withBearer("Bearer dndt_x"), "c1", { access: "dm", scope: "content:read" })).toEqual({ campaignId: "c1", userId: "dm", isDM: true, via: "token", scopes: ["content:write"] });
    expect(apiAuth.requireDM).not.toHaveBeenCalled();
    expect(apiAuth.requireCampaignAccess).not.toHaveBeenCalled();
  });

  it("недійсний або відкликаний токен із cookie — 401 без відкату до сесії", async () => {
    vi.mocked(verifyApiToken).mockResolvedValue(null);
    expect(status(await resolveActor(withBearer("Bearer dndt_bad"), "c1", { access: "member", scope: "content:read" }))).toBe(401);
    expect(apiAuth.requireCampaignAccess).not.toHaveBeenCalled();
  });

  it.each(["Bearer", "Bearer   ", "Basic abc"])("заголовок «%s» — 401", async (value) => {
    vi.mocked(verifyApiToken).mockResolvedValue(null);
    expect(status(await resolveActor(withBearer(value), "c1", { access: "member", scope: "content:read" }))).toBe(401);
    expect(verifyApiToken).not.toHaveBeenCalled();
    expect(apiAuth.requireCampaignAccess).not.toHaveBeenCalled();
  });

  it("немає scope — 403", async () => {
    token(["ai"]);
    expect(status(await resolveActor(withBearer("Bearer dndt_x"), "c1", { access: "member", scope: "content:read" }))).toBe(403);
  });

  it("лише читання на запис — 403", async () => {
    token(["content:read"]);
    expect(status(await resolveActor(withBearer("Bearer dndt_x"), "c1", { access: "dm", scope: "content:write" }))).toBe(403);
  });

  it("токен іншої кампанії — 403", async () => {
    token(["content:write"], "other");
    expect(status(await resolveActor(withBearer("Bearer dndt_x"), "c1", { access: "dm", scope: "content:read" }))).toBe(403);
  });

  it("sessionOnly з токеном — 403", async () => {
    token(["content:write"]);
    expect(status(await resolveActor(withBearer("Bearer dndt_x"), "c1", { access: "dm", scope: "content:write", sessionOnly: true }))).toBe(403);
  });
});
