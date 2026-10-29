import { beforeEach, describe, expect, it, vi } from "vitest";

import { ownedSlidePath, removeSlideFiles } from "../scene-slide-storage";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ storage: { from: () => ({ remove: async () => ({ error: { message: "SECRET_STORAGE_ERROR" } }) }) } }) }));

const id = "a".repeat(32);

const url = (path: string) => `https://p.supabase.co/storage/v1/object/public/scene-slides/${path}`;

describe("ownedSlidePath", () => {
  beforeEach(() => void vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://p.supabase.co"));

  it("приймає імена зі завантаження і дзеркала цієї кампанії", () => {
    for (const ext of ["webp", "jpg", "png", "gif"]) expect(ownedSlidePath("c1", url(`c1/${id}.${ext}`))).toBe(`c1/${id}.${ext}`);
  });

  it("відхиляє чужу кампанію, обхід шляху, вкладені шляхи й довільні імена", () => {
    expect(ownedSlidePath("c1", url(`c2/${id}.webp`))).toBeNull();
    expect(ownedSlidePath("c1", url("c1/../c2/x.webp"))).toBeNull();
    expect(ownedSlidePath("c1", url(`c1/sub/${id}.webp`))).toBeNull();
    expect(ownedSlidePath("c1", url("c1/mirrored.png"))).toBeNull();
    expect(ownedSlidePath("c1", url(`c1/${id}.svg`))).toBeNull();
  });

  it("відхиляє інший бакет і сторонні URL", () => {
    expect(ownedSlidePath("c1", `https://p.supabase.co/storage/v1/object/public/avatars/c1/${id}.webp`)).toBeNull();
    expect(ownedSlidePath("c1", `https://example.com/c1/${id}.webp`)).toBeNull();
  });

  it("декодує ключ публічного URL", () => {
    expect(ownedSlidePath("c1", url(`c1%2F${id}.webp`))).toBe(`c1/${id}.webp`);
  });
});

it("strict durable cleanup reports failure rather than completed effect", async () => {
  await expect(removeSlideFiles("c1", [url(`c1/${id}.webp`)], { strict: true })).rejects.toThrow("Failed to clean up media");
});
