import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveImageForPersistence = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/lib/supabase/scene-slide-storage", () => ({ ensureSlidesBucket: async () => ({ ok: true, value: undefined }) }));
vi.mock("@/lib/supabase/image-storage", () => ({ isHostedOnProjectStorage: () => false, resolveImageForPersistence }));

import { API_ERRORS } from "@/lib/constants/api-errors";
import { persistSlideImages } from "@/lib/server/show/deck-store";
import type { Slide } from "@/types/show";

const slide = (imageUrl: string) => ({ imageUrl }) as Slide;

describe("persistSlideImages failure", () => {
  beforeEach(() => resolveImageForPersistence.mockReset());

  it("returns a key with index and detail params, not a concatenated string", async () => {
    resolveImageForPersistence.mockResolvedValue({ ok: false, message: API_ERRORS.SAFE_FETCH_FAILED });

    const result = await persistSlideImages("c1", [slide("https://x/a.png"), slide("https://x/b.png")], []);

    expect(result).toEqual({ ok: false, message: API_ERRORS.SLIDE_IMAGE_FAILED, params: { index: 1, detail: API_ERRORS.SAFE_FETCH_FAILED } });
  });
});
