import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getResponseJson } from "./helpers";

const state = vi.hoisted(() => ({ actor: null as unknown }));

const importContent = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/actor", () => ({ resolveActor: vi.fn(async () => state.actor) }));
vi.mock("@/lib/server/content/import/import-content", () => ({ importContent }));

import { POST } from "@/app/api/campaigns/[id]/content-import/[kind]/route";
import { resolveActor } from "@/lib/utils/api/actor";

const actor = { campaignId: "c1", userId: "u", isDM: true, via: "session", scopes: null };

const REPORT = { dryRun: true, results: [], counts: { created: 0, updated: 0, skipped: 0, error: 0 } };

const post = (kind: string, body: unknown) =>
  POST(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "c1", kind }) }) as Promise<NextResponse>;

describe("POST /content-import/[kind]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.actor = actor;
    importContent.mockResolvedValue(REPORT);
  });

  it("права: ДМ + content:write через resolveActor", async () => {
    state.actor = NextResponse.json({ error: "stop" }, { status: 418 });

    expect((await post("units", { rows: [{ name: "А" }] })).status).toBe(418);
    expect(resolveActor).toHaveBeenCalledWith(expect.any(Request), "c1", { access: "dm", scope: "content:write" });
  });

  it("тіло з defaults іде в importContent, відповідь — звіт", async () => {
    const res = await post("spells", { rows: [{ name: "А" }], dryRun: true });

    expect(res.status).toBe(200);
    expect(await getResponseJson(res)).toEqual(REPORT);
    expect(importContent).toHaveBeenCalledWith(actor, "spells", { rows: [{ name: "А" }], mode: "create", dryRun: true });
  });

  it("вид поза імпортом (tracks) — 404", async () => {
    const res = await post("tracks", { rows: [{ name: "А" }] });

    expect(res.status).toBe(404);
    expect(importContent).not.toHaveBeenCalled();
  });

  it("501 рядок — 400 без виклику", async () => {
    const res = await post("units", { rows: Array.from({ length: 501 }, () => ({ name: "А" })) });

    expect(res.status).toBe(400);
    expect(importContent).not.toHaveBeenCalled();
  });
});
