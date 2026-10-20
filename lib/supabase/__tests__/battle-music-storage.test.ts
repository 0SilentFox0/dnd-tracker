import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTrackUploadTicket,
  removeTrackFile,
  trackObjectPath,
  trackPathOwnedBy,
  verifyUploadedTrack,
} from "@/lib/supabase/battle-music-storage";

const bucketApi = vi.hoisted(() => ({
  createSignedUploadUrl: vi.fn(),
  info: vi.fn(),
  remove: vi.fn(async () => ({ data: [], error: null })),
  getPublicUrl: vi.fn((path: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/battle-music/${path}` } })),
}));

const storage = vi.hoisted(() => ({
  listBuckets: vi.fn(async () => ({ data: [{ name: "battle-music" }], error: null })),
  createBucket: vi.fn(async () => ({ data: { name: "battle-music" }, error: null })),
  from: vi.fn(() => bucketApi),
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ storage }) }));

const PATH = "camp1/0123456789abcdef0123456789abcdef.mp3";

describe("battle-music storage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("шлях належить кампанії лише у форматі <campaignId>/<uuid32>.mp3|m4a", () => {
    expect(trackPathOwnedBy(PATH, "camp1")).toBe(true);
    expect(trackPathOwnedBy(PATH, "camp2")).toBe(false);
    expect(trackPathOwnedBy("camp1/../camp2/x.mp3", "camp1")).toBe(false);
    expect(trackPathOwnedBy("camp1/0123456789abcdef0123456789abcdef.ogg", "camp1")).toBe(false);
  });

  it("квиток: бакет створюється з лімітом 10 МБ і аудіо-типами, шлях у теці кампанії", async () => {
    storage.listBuckets.mockResolvedValueOnce({ data: [], error: null });
    bucketApi.createSignedUploadUrl.mockImplementation(async (path: string) => ({ data: { path, token: "tok", signedUrl: "u" }, error: null }));

    const r = await createTrackUploadTicket("camp1", "m4a");

    expect(storage.createBucket).toHaveBeenCalledWith("battle-music", { public: true, fileSizeLimit: 10 * 1024 * 1024, allowedMimeTypes: ["audio/mpeg", "audio/mp4"] });
    expect(r).toMatchObject({ ok: true, value: { bucket: "battle-music", token: "tok", contentType: "audio/mp4" } });
    expect(r.ok && trackPathOwnedBy(r.value.path, "camp1")).toBe(true);
  });

  it("перевірка: існує, ≤ 10 МБ, аудіо — публічний URL; інакше обʼєкт видаляється", async () => {
    bucketApi.info.mockResolvedValueOnce({ data: { size: 5_000_000, contentType: "audio/mpeg" }, error: null });
    expect(await verifyUploadedTrack(PATH)).toEqual({ ok: true, value: `https://x.supabase.co/storage/v1/object/public/battle-music/${PATH}` });

    bucketApi.info.mockResolvedValueOnce({ data: { size: 20_000_000, contentType: "audio/mpeg" }, error: null });
    expect(await verifyUploadedTrack(PATH)).toEqual({ ok: false, message: "Потрібен файл MP3 або M4A до 10 МБ" });
    expect(bucketApi.remove).toHaveBeenCalledWith([PATH]);

    bucketApi.info.mockResolvedValueOnce({ data: null, error: { message: "not found" } });
    expect(await verifyUploadedTrack(PATH)).toEqual({ ok: false, message: "Файл не завантажено — спробуйте ще раз" });
  });

  it("видалення: шлях із публічного URL; чужий URL — нічого", async () => {
    const url = `https://x.supabase.co/storage/v1/object/public/battle-music/${PATH}`;

    expect(trackObjectPath(url)).toBe(PATH);
    expect(trackObjectPath("https://example.com/a.mp3")).toBeNull();

    await removeTrackFile(url);
    expect(bucketApi.remove).toHaveBeenCalledWith([PATH]);

    bucketApi.remove.mockClear();
    await removeTrackFile("https://example.com/a.mp3");
    expect(bucketApi.remove).not.toHaveBeenCalled();
  });
});
