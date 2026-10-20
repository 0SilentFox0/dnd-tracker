import { beforeEach, describe, expect, it, vi } from "vitest";

import { AVATARS_BUCKET, resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";
import * as storage from "@/lib/supabase/image-storage";

vi.mock("@/lib/supabase/image-storage", async (orig) => ({ ...(await orig<typeof storage>()), resolveImageForPersistence: vi.fn() }));

describe("resolveAvatarForPersistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("передає поточне значення, бакет avatars і річний cacheControl", async () => {
    vi.mocked(storage.resolveImageForPersistence).mockResolvedValue({ ok: true, value: "https://s/avatars/c/x.webp" });

    const r = await resolveAvatarForPersistence("data:image/webp;base64,AAAA", { campaignId: "c", current: "old" });

    expect(r).toEqual({ ok: true, avatar: "https://s/avatars/c/x.webp" });
    expect(storage.resolveImageForPersistence).toHaveBeenCalledWith("data:image/webp;base64,AAAA", { campaignId: "c", current: "old", bucket: AVATARS_BUCKET, cacheControl: "31536000" });
  });

  it("помилка завантаження повертається як ok:false", async () => {
    vi.mocked(storage.resolveImageForPersistence).mockResolvedValue({ ok: false, message: "Файл завеликий (макс. 5 МБ)" });
    expect(await resolveAvatarForPersistence("data:image/png;base64,AAAA", { campaignId: "c" })).toEqual({ ok: false, message: "Файл завеликий (макс. 5 МБ)" });
  });
});
