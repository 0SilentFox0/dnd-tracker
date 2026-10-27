import { beforeEach, describe, expect, it, vi } from "vitest";

import { imageBucketStorage } from "../image-bucket-storage";

const createSignedUploadUrl = vi.fn();

const remove = vi.fn();

const listBuckets = vi.fn();

const createBucket = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl,
        remove,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://p.supabase.co/storage/v1/object/public/test-bucket/${path}` } }),
      }),
      listBuckets,
      createBucket,
      updateBucket: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

const store = imageBucketStorage({ bucket: "test-bucket", maxBytes: 100, formats: { "image/webp": "webp" }, bucketTypes: ["image/webp"], logTag: "test" });

const id = "b".repeat(32);

const url = (path: string, bucket = "test-bucket") => `https://p.supabase.co/storage/v1/object/public/${bucket}/${path}`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://p.supabase.co");
  listBuckets.mockResolvedValue({ data: [{ name: "test-bucket" }], error: null });
  createBucket.mockResolvedValue({ error: null });
  createSignedUploadUrl.mockImplementation(async (path: string) => ({ data: { path, token: "t" }, error: null }));
});

describe("imageBucketStorage", () => {
  it("тікет має шлях <кампанія>/<32hex>.webp", async () => {
    const res = await store.createTicket("c1", "image/webp");

    expect(res.ok).toBe(true);

    if (res.ok) {
      expect(res.value.path).toMatch(/^c1\/[a-f0-9]{32}\.webp$/);
      expect(res.value.bucket).toBe("test-bucket");
      expect(res.value.contentType).toBe("image/webp");
    }
  });

  it("ownedPath приймає свій URL, відхиляє чужу кампанію, чужий бакет і ../", () => {
    expect(store.ownedPath("c1", url(`c1/${id}.webp`))).toBe(`c1/${id}.webp`);
    expect(store.ownedPath("c1", url(`c2/${id}.webp`))).toBeNull();
    expect(store.ownedPath("c1", url(`c1/${id}.webp`, "other"))).toBeNull();
    expect(store.ownedPath("c1", url("c1/../c2/x.webp"))).toBeNull();
    expect(store.ownedPath("c1", `https://evil.supabase.co/storage/v1/object/public/test-bucket/c1/${id}.webp`)).toBeNull();
  });

  it("remove передає лише власні шляхи і ковтає помилку", async () => {
    remove.mockResolvedValue({ error: { message: "boom" } });

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await store.remove("c1", [url(`c1/${id}.webp`), url(`c2/${id}.webp`)]);

    expect(remove).toHaveBeenCalledWith([`c1/${id}.webp`]);
    expect(warn).toHaveBeenCalled();

    remove.mockRejectedValue(new Error("net"));

    await expect(store.remove("c1", [url(`c1/${id}.webp`)])).resolves.toBeUndefined();
    warn.mockRestore();
  });

  it("remove без власних шляхів не звертається до storage", async () => {
    await store.remove("c1", [url(`c2/${id}.webp`)]);

    expect(remove).not.toHaveBeenCalled();
  });
});
