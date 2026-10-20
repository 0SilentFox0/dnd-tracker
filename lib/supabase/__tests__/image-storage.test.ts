import { beforeEach, describe, expect, it, vi } from "vitest";

import { isHostedOnProjectStorage, mirrorImageUrl, resolveImageForPersistence, uploadImageDataUrl } from "@/lib/supabase/image-storage";
import { safeFetchBuffer, SafeFetchError } from "@/lib/utils/api/safe-fetch";

const upload = vi.hoisted(() => vi.fn());

const storage = vi.hoisted(() => ({
  listBuckets: vi.fn(async () => ({ data: [{ name: "artifact-icons" }], error: null })),
  createBucket: vi.fn(async () => ({ data: null, error: null })),
  from: vi.fn(() => ({ upload, getPublicUrl: (p: string) => ({ data: { publicUrl: `https://s/${p}` } }) })),
}));

vi.mock("@/lib/utils/api/safe-fetch", async (orig) => ({ ...(await orig<typeof import("@/lib/utils/api/safe-fetch")>()), safeFetchBuffer: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ storage }) }));

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);

const PNG_DATA_URL = `data:image/png;base64,${PNG.toString("base64")}`;

const opts = { campaignId: "c", objectBaseName: "a", bucket: "artifact-icons" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
  upload.mockResolvedValue({ error: null });
});

describe("image storage hardening", () => {
  it("mirrors a valid png", async () => {
    vi.mocked(safeFetchBuffer).mockResolvedValue({ status: 200, contentType: "image/png", body: PNG });

    expect(await mirrorImageUrl("https://ok.example/a.png", opts)).toEqual({ ok: true, value: "https://s/c/a.png" });
    expect(upload).toHaveBeenCalledOnce();
  });

  it("accepts a png served with another allowed raster content-type, stores the sniffed type", async () => {
    vi.mocked(safeFetchBuffer).mockResolvedValue({ status: 200, contentType: "image/jpeg", body: PNG });

    expect(await mirrorImageUrl("https://ok.example/a.jpg", opts)).toEqual({ ok: true, value: "https://s/c/a.png" });
    expect(upload).toHaveBeenCalledWith("c/a.png", PNG, expect.objectContaining({ contentType: "image/png" }));
  });

  it("rejects SVG from a URL, even if disguised as png", async () => {
    vi.mocked(safeFetchBuffer).mockResolvedValue({ status: 200, contentType: "image/svg+xml", body: Buffer.from("<svg/>") });
    expect((await mirrorImageUrl("https://ok.example/a.svg", opts)).ok).toBe(false);

    vi.mocked(safeFetchBuffer).mockResolvedValue({ status: 200, contentType: "image/png", body: Buffer.from("<svg/>") });
    expect((await mirrorImageUrl("https://ok.example/a.png", opts)).ok).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects SVG data URLs and mismatched bytes", async () => {
    const svg = `data:image/svg+xml;base64,${Buffer.from("<svg/>").toString("base64")}`;

    const fake = `data:image/png;base64,${Buffer.from("<svg/>").toString("base64")}`;

    expect((await uploadImageDataUrl(svg, opts)).ok).toBe(false);
    expect((await uploadImageDataUrl(fake, opts)).ok).toBe(false);
    expect(await uploadImageDataUrl(PNG_DATA_URL, opts)).toEqual({ ok: true, value: "https://s/c/a.png" });
  });

  it("propagates safe-fetch errors as Ukrainian messages", async () => {
    vi.mocked(safeFetchBuffer).mockRejectedValue(new SafeFetchError("Посилання на внутрішню адресу заборонене"));

    expect(await mirrorImageUrl("https://10.0.0.1/a.png", opts)).toEqual({ ok: false, message: "Посилання на внутрішню адресу заборонене" });
  });
});

describe("resolveImageForPersistence", () => {
  const target = { campaignId: "c", bucket: "avatars", cacheControl: "31536000" };

  it("undefined, незмінене значення і наш Storage — без завантаження", async () => {
    const ours = "https://x.supabase.co/storage/v1/object/public/avatars/c/a.webp";

    expect(await resolveImageForPersistence(undefined, target)).toEqual({ ok: true, value: undefined });
    expect(await resolveImageForPersistence("https://game-icons.net/a.svg", { ...target, current: "https://game-icons.net/a.svg" })).toEqual({ ok: true, value: "https://game-icons.net/a.svg" });
    expect(await resolveImageForPersistence(ours, target)).toEqual({ ok: true, value: ours });
    expect(await resolveImageForPersistence("  ", target)).toEqual({ ok: true, value: null });
    expect(await resolveImageForPersistence(null, target)).toEqual({ ok: true, value: null });
    expect(safeFetchBuffer).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it("data URL вантажиться в бакет з cacheControl і випадковим іменем", async () => {
    const r = await resolveImageForPersistence(PNG_DATA_URL, target);

    expect(r.ok).toBe(true);
    expect(storage.from).toHaveBeenCalledWith("avatars");
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^c\/[a-f0-9]{32}\.png$/), PNG, { contentType: "image/png", upsert: true, cacheControl: "31536000" });
  });

  it("зовнішній URL дзеркалиться під заданим іменем; чужий хост не вважається нашим Storage", async () => {
    vi.mocked(safeFetchBuffer).mockResolvedValue({ status: 200, contentType: "image/png", body: PNG });

    expect(await resolveImageForPersistence("https://y.supabase.co/storage/v1/object/public/a.png", { ...target, objectBaseName: "m" })).toEqual({ ok: true, value: "https://s/c/m.png" });
    expect(safeFetchBuffer).toHaveBeenCalledOnce();
  });

  it("короткий не-http рядок лишається, задовгий — помилка", async () => {
    expect(await resolveImageForPersistence(" /icons/a.png ", target)).toEqual({ ok: true, value: "/icons/a.png" });
    expect((await resolveImageForPersistence(`x${"a".repeat(2000)}`, target)).ok).toBe(false);
  });

  it("бакет перевіряється один раз на інстанс", async () => {
    storage.listBuckets.mockResolvedValueOnce({ data: [], error: null });

    const memo = { ...target, bucket: "memo-bucket" };

    await resolveImageForPersistence(PNG_DATA_URL, memo);
    await resolveImageForPersistence(PNG_DATA_URL, memo);

    expect(storage.listBuckets).toHaveBeenCalledOnce();
    expect(storage.createBucket).toHaveBeenCalledWith("memo-bucket", { public: true });
    expect(upload).toHaveBeenCalledTimes(2);
  });
});

describe("isHostedOnProjectStorage", () => {
  it("хост і префікс шляху збігаються з NEXT_PUBLIC_SUPABASE_URL", () => {
    expect(isHostedOnProjectStorage("https://x.supabase.co/storage/v1/object/public/artifact-icons/a.png")).toBe(true);
    expect(isHostedOnProjectStorage("https://y.supabase.co/storage/v1/object/public/a.png")).toBe(false);
    expect(isHostedOnProjectStorage("https://evil.example/?supabase.co/storage")).toBe(false);
    expect(isHostedOnProjectStorage("https://x.supabase.co/other/path.png")).toBe(false);
    expect(isHostedOnProjectStorage("not a url")).toBe(false);
  });
});
