import { beforeEach, describe, expect, it, vi } from "vitest";

import { mirrorArtifactIconToSupabase, uploadArtifactIconDataUrlToSupabase } from "@/lib/supabase/artifact-icon-storage";
import { safeFetchBuffer,SafeFetchError } from "@/lib/utils/api/safe-fetch";

const upload = vi.hoisted(() => vi.fn());

vi.mock("@/lib/utils/api/safe-fetch", async (orig) => ({ ...(await orig<typeof import("@/lib/utils/api/safe-fetch")>()), safeFetchBuffer: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      listBuckets: async () => ({ data: [{ name: "artifact-icons" }], error: null }),
      from: () => ({ upload, getPublicUrl: (p: string) => ({ data: { publicUrl: `https://s/${p}` } }) }),
    },
  }),
}));

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

const opts = { campaignId: "c", objectBaseName: "a" };

describe("artifact icon storage hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upload.mockResolvedValue({ error: null });
  });

  it("mirrors a valid png", async () => {
    vi.mocked(safeFetchBuffer).mockResolvedValue({ status: 200, contentType: "image/png", body: PNG });

    expect(await mirrorArtifactIconToSupabase("https://ok.example/a.png", opts)).toEqual({ ok: true, publicUrl: "https://s/c/a.png" });
    expect(upload).toHaveBeenCalledOnce();
  });

  it("accepts a png served with another allowed raster content-type, stores the sniffed type", async () => {
    vi.mocked(safeFetchBuffer).mockResolvedValue({ status: 200, contentType: "image/jpeg", body: PNG });

    expect(await mirrorArtifactIconToSupabase("https://ok.example/a.jpg", opts)).toEqual({ ok: true, publicUrl: "https://s/c/a.png" });
    expect(upload).toHaveBeenCalledWith("c/a.png", PNG, expect.objectContaining({ contentType: "image/png" }));
  });

  it("rejects SVG from a URL, even if disguised as png", async () => {
    vi.mocked(safeFetchBuffer).mockResolvedValue({ status: 200, contentType: "image/svg+xml", body: Buffer.from("<svg/>") });
    expect((await mirrorArtifactIconToSupabase("https://ok.example/a.svg", opts)).ok).toBe(false);

    vi.mocked(safeFetchBuffer).mockResolvedValue({ status: 200, contentType: "image/png", body: Buffer.from("<svg/>") });
    expect((await mirrorArtifactIconToSupabase("https://ok.example/a.png", opts)).ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects SVG data URLs and mismatched bytes", async () => {
    const svg = `data:image/svg+xml;base64,${Buffer.from("<svg/>").toString("base64")}`;

    const fake = `data:image/png;base64,${Buffer.from("<svg/>").toString("base64")}`;

    expect((await uploadArtifactIconDataUrlToSupabase(svg, opts)).ok).toBe(false);
    expect((await uploadArtifactIconDataUrlToSupabase(fake, opts)).ok).toBe(false);
    expect(await uploadArtifactIconDataUrlToSupabase(`data:image/png;base64,${PNG.toString("base64")}`, opts)).toEqual({ ok: true, publicUrl: "https://s/c/a.png" });
  });

  it("propagates safe-fetch errors as Ukrainian messages", async () => {
    vi.mocked(safeFetchBuffer).mockRejectedValue(new SafeFetchError("Посилання на внутрішню адресу заборонене"));

    expect(await mirrorArtifactIconToSupabase("https://10.0.0.1/a.png", opts)).toEqual({ ok: false, message: "Посилання на внутрішню адресу заборонене" });
  });
});
