import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listSummariesHandler } from "../summaries-handler";

import * as apiAuth from "@/lib/utils/api/api-auth";

const h = vi.hoisted(() => ({ available: vi.fn(), load: vi.fn(), configured: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/crypto", () => ({ isAiConfigured: h.configured }));
vi.mock("@/lib/ai/dm-model", () => ({ readDmSmartAvailability: h.available }));
vi.mock("@/lib/server/scenario/summary-store", () => ({ loadSummaries: h.load }));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));

describe("listSummariesHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "u1", isDM: true } as never);
    h.configured.mockReturnValue(true);
    h.available.mockResolvedValue(true);
    h.load.mockResolvedValue({ summaries: { p1: { version: 1, stale: true } } });
  });

  it("player gets 403", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await listSummariesHandler("c1")).status).toBe(403);
    expect(h.load).not.toHaveBeenCalled();
  });

  it("returns availability and stale entries, scoped to the campaign, no-store", async () => {
    const res = await listSummariesHandler("c1");

    expect(await res.json()).toEqual({ available: true, summaries: { p1: { version: 1, stale: true } } });
    expect(res.headers.get("cache-control")).toMatch(/no-store/);
    expect(h.load).toHaveBeenCalledWith("c1");
    expect(h.available).toHaveBeenCalledWith("c1");
  });

  it("is unavailable when the server has no AI secret even if keys exist", async () => {
    h.configured.mockReturnValue(false);

    expect((await (await listSummariesHandler("c1")).json()).available).toBe(false);
  });
});
