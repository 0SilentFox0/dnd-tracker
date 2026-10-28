import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/campaigns/[id]/source-sync/route";
import { verifyApiToken } from "@/lib/ai/api-tokens";
import { ContentError } from "@/lib/server/content/errors";
import { applySource, getSourceDiff } from "@/lib/server/templates/sync/service";
import * as apiAuth from "@/lib/utils/api/api-auth";

vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn(), requireCampaignAccess: vi.fn() }));
vi.mock("@/lib/ai/api-tokens", () => ({ verifyApiToken: vi.fn() }));
vi.mock("@/lib/server/templates/sync/service", () => ({ getSourceDiff: vi.fn(), applySource: vi.fn() }));

const params = { params: Promise.resolve({ id: "c1" }) };

const post = (body: unknown, headers: Record<string, string> = {}) => POST(new Request("http://x", { method: "POST", body: JSON.stringify(body), headers }), params);

const REF = { scope: "spells", key: "k", sourceHash: "h", status: "updated" };

describe("source-sync API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "u", isDM: true } as never);
  });

  it("GET повертає diff і передає scope з query", async () => {
    vi.mocked(getSourceDiff).mockResolvedValue({ items: [] } as never);

    const res = await GET(new Request("http://x?scope=spells"), params);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
    expect(getSourceDiff).toHaveBeenCalledWith(expect.objectContaining({ campaignId: "c1", userId: "u" }), "spells");
  });

  it("GET без scope передає undefined", async () => {
    vi.mocked(getSourceDiff).mockResolvedValue({} as never);

    await GET(new Request("http://x"), params);

    expect(getSourceDiff).toHaveBeenCalledWith(expect.anything(), undefined);
  });

  it("GET з невідомим scope: 400 без виклику сервісу", async () => {
    const res = await GET(new Request("http://x?scope=bogus"), params);

    expect(res.status).toBe(400);
    expect(getSourceDiff).not.toHaveBeenCalled();
  });

  it("POST з невідомим scope або без status: 400", async () => {
    expect((await post({ apply: [{ ...REF, scope: "bogus" }] })).status).toBe(400);
    expect((await post({ apply: [{ scope: "spells", key: "k", sourceHash: "h" }] })).status).toBe(400);
    expect(applySource).not.toHaveBeenCalled();
  });

  it("POST з некоректним тілом: 400 без виклику сервісу", async () => {
    expect((await post({ apply: "x" })).status).toBe(400);
    expect(applySource).not.toHaveBeenCalled();
  });

  it("POST з apply: 200 і ignore за замовчуванням []", async () => {
    vi.mocked(applySource).mockResolvedValue({ applied: 1 } as never);

    const res = await post({ apply: [REF] });

    expect(res.status).toBe(200);
    expect(applySource).toHaveBeenCalledWith(expect.anything(), { apply: [REF], ignore: [] });
  });

  it("ContentError 409 із сервісу → 409 з error", async () => {
    vi.mocked(applySource).mockRejectedValue(new ContentError("Джерело змінилося", 409));

    const res = await post({ apply: [REF] });

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Джерело змінилося" });
  });

  it("токен без content:write на POST: 403", async () => {
    vi.mocked(verifyApiToken).mockResolvedValue({ campaignId: "c1", userId: "u", scopes: ["content:read"] } as never);

    const res = await post({ apply: [REF] }, { authorization: "Bearer dndt_abc" });

    expect(res.status).toBe(403);
    expect(applySource).not.toHaveBeenCalled();
  });
});
