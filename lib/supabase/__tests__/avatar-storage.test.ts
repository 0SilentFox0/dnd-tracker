import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storage from "@/lib/supabase/artifact-icon-storage";
import { AVATARS_BUCKET, resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";

vi.mock("@/lib/supabase/artifact-icon-storage", async (orig) => ({ ...(await orig<typeof storage>()), resolveArtifactIconForPersistence: vi.fn() }));

describe("resolveAvatarForPersistence", () => {
  beforeEach(() => vi.clearAllMocks());

  it("undefined лишає поле незмінним, нічого не вантажить", async () => {
    expect(await resolveAvatarForPersistence(undefined, { campaignId: "c" })).toEqual({ ok: true, avatar: undefined });
    expect(storage.resolveArtifactIconForPersistence).not.toHaveBeenCalled();
  });

  it("http-URL нашого Storage зберігається як є", async () => {
    const url = "https://x.supabase.co/storage/v1/object/public/avatars/c/a.webp";

    expect(await resolveAvatarForPersistence(url, { campaignId: "c" })).toEqual({ ok: true, avatar: url });
    expect(storage.resolveArtifactIconForPersistence).not.toHaveBeenCalled();
  });

  it("data URL вантажиться в бакет avatars з річним cacheControl", async () => {
    vi.mocked(storage.resolveArtifactIconForPersistence).mockResolvedValue({ ok: true, icon: "https://s/avatars/c/x.webp" });

    const r = await resolveAvatarForPersistence("data:image/webp;base64,AAAA", { campaignId: "c" });

    expect(r).toEqual({ ok: true, avatar: "https://s/avatars/c/x.webp" });
    expect(storage.resolveArtifactIconForPersistence).toHaveBeenCalledWith("data:image/webp;base64,AAAA", expect.objectContaining({ campaignId: "c", bucket: AVATARS_BUCKET, cacheControl: "31536000" }));
  });

  it("помилка завантаження повертається як ok:false", async () => {
    vi.mocked(storage.resolveArtifactIconForPersistence).mockResolvedValue({ ok: false, message: "Файл завеликий (макс. 5 МБ)" });
    expect(await resolveAvatarForPersistence("data:image/png;base64,AAAA", { campaignId: "c" })).toEqual({ ok: false, message: "Файл завеликий (макс. 5 МБ)" });
  });
});
