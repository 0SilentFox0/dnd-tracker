import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COMPENDIUM_MEDIA_BUCKET, storeCompendiumImage } from "../compendium-media-storage";

import type { FetchedImage } from "@/lib/server/compendium-import/media/fetch-image";

const ensureBucket = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/buckets", () => ({ ensureBucket }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const upload = vi.fn();

const admin = {
  storage: { from: vi.fn(() => ({ upload, getPublicUrl: (p: string) => ({ data: { publicUrl: `https://p.supabase.co/${p}` } }) })) },
} as never;

const SHA = "ab" + "c".repeat(62);

async function png(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: "#f00" } }).png().toBuffer();
}

const image = (bytes: Buffer, mime: "image/png" | "image/gif" = "image/png"): Extract<FetchedImage, { ok: true }> => ({ ok: true, bytes, mime, sha256: SHA });

describe("storeCompendiumImage", () => {
  beforeEach(() => {
    ensureBucket.mockReset().mockResolvedValue({ ok: true });
    upload.mockReset().mockResolvedValue({ error: null });
  });

  afterEach(() => vi.useRealTimers());

  it("compresses to webp with a sha-based path and immutable upload options", async () => {
    const r = await storeCompendiumImage(image(await png(2000, 1000)), "inline", admin);

    expect(r).toEqual({ ok: true, value: `https://p.supabase.co/ab/${SHA}-1600.webp` });
    expect(ensureBucket).toHaveBeenCalledWith(admin, COMPENDIUM_MEDIA_BUCKET, {
      public: true,
      fileSizeLimit: 1024 * 1024,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
    });

    const [path, bytes, options] = upload.mock.calls[0];

    expect(path).toBe(`ab/${SHA}-1600.webp`);
    expect(options).toEqual({ contentType: "image/webp", upsert: false, cacheControl: "31536000" });
    expect(await sharp(bytes).metadata()).toMatchObject({ format: "webp", width: 1600, height: 800 });
  });

  it("uses 512 for avatar and icon and never enlarges", async () => {
    await storeCompendiumImage(image(await png(100, 100)), "avatar", admin);
    await storeCompendiumImage(image(await png(900, 900)), "icon", admin);

    expect(upload.mock.calls[0][0]).toBe(`ab/${SHA}-512.webp`);
    expect(await sharp(upload.mock.calls[0][1]).metadata()).toMatchObject({ width: 100 });
    expect(await sharp(upload.mock.calls[1][1]).metadata()).toMatchObject({ width: 512 });
  });

  it("stores gif as is", async () => {
    const gif = Buffer.from("GIF89a-data", "latin1");

    await storeCompendiumImage(image(gif, "image/gif"), "inline", admin);

    const [path, bytes, options] = upload.mock.calls[0];

    expect(path).toBe(`ab/${SHA}.gif`);
    expect(bytes).toBe(gif);
    expect(options.contentType).toBe("image/gif");
  });

  it("treats duplicates as success", async () => {
    upload.mockResolvedValue({ error: { message: "The resource already exists", statusCode: "409" } });

    expect((await storeCompendiumImage(image(await png(10, 10)), "icon", admin)).ok).toBe(true);

    upload.mockResolvedValue({ error: { message: "Duplicate" } });

    expect((await storeCompendiumImage(image(await png(10, 10)), "icon", admin)).ok).toBe(true);
  });

  it("maps storage and bucket failures to MEDIA_STORAGE_FAILED", async () => {
    upload.mockResolvedValue({ error: { message: "secret detail", statusCode: "500" } });
    expect(await storeCompendiumImage(image(await png(10, 10)), "icon", admin)).toEqual({ ok: false, message: "MEDIA_STORAGE_FAILED" });

    ensureBucket.mockResolvedValue({ ok: false, message: "x" });
    expect(await storeCompendiumImage(image(await png(10, 10)), "icon", admin)).toEqual({ ok: false, message: "MEDIA_STORAGE_FAILED" });
  });

  it("reports undecodable bytes as MEDIA_BAD_FORMAT", async () => {
    expect(await storeCompendiumImage(image(Buffer.from([0x89, 0x50, 0x4e, 0x47, 1])), "icon", admin)).toEqual({ ok: false, message: "MEDIA_BAD_FORMAT" });
    expect(upload).not.toHaveBeenCalled();
  });

  it("times out after 15 s", async () => {
    const bytes = await png(10, 10);

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    upload.mockImplementation(() => new Promise(() => {}));

    const p = storeCompendiumImage(image(bytes), "icon", admin);

    while (vi.getTimerCount() === 0) await new Promise((r) => setImmediate(r));

    await vi.advanceTimersByTimeAsync(15_001);
    expect(await p).toEqual({ ok: false, message: "MEDIA_STORAGE_FAILED" });
  });
});
