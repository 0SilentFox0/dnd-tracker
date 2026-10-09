import { beforeEach, describe, expect, it, vi } from "vitest";

import { isArtifactIconHostedOnProjectStorage } from "@/lib/supabase/artifact-icon-storage";
import * as storage from "@/lib/supabase/artifact-icon-storage";
import { AVATARS_BUCKET, resolveAvatarForPersistence } from "@/lib/supabase/avatar-storage";

vi.mock("@/lib/supabase/artifact-icon-storage", async (orig) => ({ ...(await orig<typeof storage>()), resolveArtifactIconForPersistence: vi.fn() }));

describe("resolveAvatarForPersistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
  });

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

  it("чужий хост із підрядком storage не вважається нашим Storage", async () => {
    vi.mocked(storage.resolveArtifactIconForPersistence).mockResolvedValue({ ok: false, message: "x" });
    await resolveAvatarForPersistence("https://evil.example/?supabase.co/storage", { campaignId: "c" });
    await resolveAvatarForPersistence("https://x.supabase.co/other/path.png", { campaignId: "c" });
    expect(storage.resolveArtifactIconForPersistence).toHaveBeenCalledTimes(2);
  });
});

describe("isArtifactIconHostedOnProjectStorage", () => {
  it("хост і префікс шляху збігаються з NEXT_PUBLIC_SUPABASE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    expect(isArtifactIconHostedOnProjectStorage("https://x.supabase.co/storage/v1/object/public/artifact-icons/a.png")).toBe(true);
    expect(isArtifactIconHostedOnProjectStorage("https://y.supabase.co/storage/v1/object/public/a.png")).toBe(false);
    expect(isArtifactIconHostedOnProjectStorage("https://evil.example/?supabase.co/storage")).toBe(false);
    expect(isArtifactIconHostedOnProjectStorage("not a url")).toBe(false);
  });
});
