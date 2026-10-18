import { beforeEach, describe, expect, it, vi } from "vitest";

import * as storage from "@/lib/supabase/artifact-icon-storage";
import { BATTLE_MAPS_BUCKET, resolveMapBackgroundForPersistence } from "@/lib/supabase/battle-map-storage";

vi.mock("@/lib/supabase/artifact-icon-storage", async (orig) => ({ ...(await orig<typeof storage>()), resolveArtifactIconForPersistence: vi.fn() }));

describe("resolveMapBackgroundForPersistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
  });

  it("undefined і null лишаються як є", async () => {
    expect(await resolveMapBackgroundForPersistence(undefined, { campaignId: "c" })).toEqual({ ok: true, background: undefined });
    expect(await resolveMapBackgroundForPersistence(null, { campaignId: "c" })).toEqual({ ok: true, background: null });
    expect(storage.resolveArtifactIconForPersistence).not.toHaveBeenCalled();
  });

  it("локальний шлях і наш Storage URL — без завантаження", async () => {
    const url = "https://x.supabase.co/storage/v1/object/public/battle-maps/c/a.webp";

    expect(await resolveMapBackgroundForPersistence("/battle-maps/nicolas-tomb.webp", { campaignId: "c" })).toEqual({ ok: true, background: "/battle-maps/nicolas-tomb.webp" });
    expect(await resolveMapBackgroundForPersistence(url, { campaignId: "c" })).toEqual({ ok: true, background: url });
    expect(storage.resolveArtifactIconForPersistence).not.toHaveBeenCalled();
  });

  it("фон, що збігається зі збереженим, лишається як є", async () => {
    const url = "https://game-icons.net/a.svg";

    expect(await resolveMapBackgroundForPersistence(url, { campaignId: "c", current: url })).toEqual({ ok: true, background: url });
    expect(storage.resolveArtifactIconForPersistence).not.toHaveBeenCalled();
  });

  it("data URL і зовнішній https вантажаться в бакет battle-maps з річним cacheControl", async () => {
    vi.mocked(storage.resolveArtifactIconForPersistence).mockResolvedValue({ ok: true, icon: "https://s/battle-maps/c/x.webp" });

    for (const input of ["data:image/webp;base64,AAAA", "https://evil.example/m.png"]) {
      expect(await resolveMapBackgroundForPersistence(input, { campaignId: "c" })).toEqual({ ok: true, background: "https://s/battle-maps/c/x.webp" });
      expect(storage.resolveArtifactIconForPersistence).toHaveBeenLastCalledWith(input, expect.objectContaining({ campaignId: "c", bucket: BATTLE_MAPS_BUCKET, cacheControl: "31536000" }));
    }
  });

  it("помилка завантаження повертається як ok:false", async () => {
    vi.mocked(storage.resolveArtifactIconForPersistence).mockResolvedValue({ ok: false, message: "Файл завеликий (макс. 5 МБ)" });
    expect(await resolveMapBackgroundForPersistence("data:image/png;base64,AAAA", { campaignId: "c" })).toEqual({ ok: false, message: "Файл завеликий (макс. 5 МБ)" });
  });
});
