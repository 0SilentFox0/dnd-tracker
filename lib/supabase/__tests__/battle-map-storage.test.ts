import { beforeEach, describe, expect, it, vi } from "vitest";

import { BATTLE_MAPS_BUCKET, resolveMapBackgroundForPersistence } from "@/lib/supabase/battle-map-storage";
import * as storage from "@/lib/supabase/image-storage";

vi.mock("@/lib/supabase/image-storage", async (orig) => ({ ...(await orig<typeof storage>()), resolveImageForPersistence: vi.fn() }));

describe("resolveMapBackgroundForPersistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("undefined, null і локальний шлях лишаються як є", async () => {
    expect(await resolveMapBackgroundForPersistence(undefined, { campaignId: "c" })).toEqual({ ok: true, background: undefined });
    expect(await resolveMapBackgroundForPersistence(null, { campaignId: "c" })).toEqual({ ok: true, background: null });
    expect(await resolveMapBackgroundForPersistence("/battle-maps/nicolas-tomb.webp", { campaignId: "c" })).toEqual({ ok: true, background: "/battle-maps/nicolas-tomb.webp" });
    expect(storage.resolveImageForPersistence).not.toHaveBeenCalled();
  });

  it("решта йде в бакет battle-maps з річним cacheControl", async () => {
    vi.mocked(storage.resolveImageForPersistence).mockResolvedValue({ ok: true, value: "https://s/battle-maps/c/x.webp" });

    expect(await resolveMapBackgroundForPersistence("https://evil.example/m.png", { campaignId: "c", current: "old" })).toEqual({ ok: true, background: "https://s/battle-maps/c/x.webp" });
    expect(storage.resolveImageForPersistence).toHaveBeenCalledWith("https://evil.example/m.png", { campaignId: "c", current: "old", bucket: BATTLE_MAPS_BUCKET, cacheControl: "31536000" });
  });

  it("помилка завантаження повертається як ok:false", async () => {
    vi.mocked(storage.resolveImageForPersistence).mockResolvedValue({ ok: false, message: "Файл завеликий (макс. 5 МБ)" });
    expect(await resolveMapBackgroundForPersistence("data:image/png;base64,AAAA", { campaignId: "c" })).toEqual({ ok: false, message: "Файл завеликий (макс. 5 МБ)" });
  });
});
