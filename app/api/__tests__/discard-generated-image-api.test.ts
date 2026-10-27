import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import * as apiAuth from "@/lib/utils/api/api-auth";

const h = vi.hoisted(() => ({ remove: vi.fn(), used: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/utils/api/api-auth", () => ({ requireDM: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { aiProposal: { findMany: vi.fn(async () => []) } } }));
vi.mock("@/lib/server/show/deck-store", () => ({ urlsUsedElsewhere: h.used }));
vi.mock("@/lib/supabase/scene-slide-storage", async (orig) => ({ ...(await orig<object>()), removeSlideFiles: h.remove }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const own = `https://x.supabase.co/storage/v1/object/public/scene-slides/c1/${"a".repeat(32)}.webp`;

const del = async (body: unknown) => {
  const { DELETE } = await import("@/app/api/campaigns/[id]/decks/generated-image/route");

  return DELETE(new Request("http://x", { method: "DELETE", body: JSON.stringify(body) }), { params: Promise.resolve({ id: "c1" }) });
};

describe("DELETE /decks/generated-image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.mocked(apiAuth.requireDM).mockResolvedValue({ userId: "u1", isDM: true } as never);
    h.used.mockResolvedValue(new Set());
    vi.mocked(prisma.aiProposal.findMany).mockResolvedValue([]);
  });

  it("не ДМ — 403, нічого не видаляється", async () => {
    vi.mocked(apiAuth.requireDM).mockResolvedValue(NextResponse.json({ error: "x" }, { status: 403 }));

    expect((await del({ url: own })).status).toBe(403);
    expect(h.remove).not.toHaveBeenCalled();
  });

  it("чужий URL (інша кампанія / не сховище) — 400", async () => {
    for (const url of [own.replace("/c1/", "/other/"), "https://evil.example/a.webp"]) {
      const res = await del({ url });

      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(API_ERRORS.AI_IMAGE_NOT_OWNED);
    }

    expect(h.remove).not.toHaveBeenCalled();
  });

  it("порожнє тіло — 400", async () => {
    expect((await del({})).status).toBe(400);
  });

  it("URL у наборі — лишається", async () => {
    h.used.mockResolvedValue(new Set([own]));

    const res = await del({ url: own });

    expect(await res.json()).toEqual({ removed: false });
    expect(h.remove).not.toHaveBeenCalled();
  });

  it("URL у відкритій пропозиції слайда — лишається", async () => {
    vi.mocked(prisma.aiProposal.findMany).mockResolvedValue([{ ops: [{ op: "addSlide", deckId: null, slide: { id: "s", imageUrl: own } }] }] as never);

    expect(await (await del({ url: own })).json()).toEqual({ removed: false });
    expect(h.remove).not.toHaveBeenCalled();
  });

  it("невикористаний — видаляється", async () => {
    const res = await del({ url: own });

    expect(await res.json()).toEqual({ removed: true });
    expect(h.remove).toHaveBeenCalledWith("c1", [own]);
  });
});
