import { describe, expect, it, vi } from "vitest";

import { ownedSlidePath, slideObjectPath } from "../scene-slide-storage";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const id = "a".repeat(32);

describe("ownedSlidePath", () => {
  it("приймає імена зі завантаження і дзеркала цієї кампанії", () => {
    expect(ownedSlidePath("c1", `c1/${id}.webp`)).toBe(true);
    expect(ownedSlidePath("c1", `c1/${id}.jpg`)).toBe(true);
    expect(ownedSlidePath("c1", `c1/${id}.png`)).toBe(true);
    expect(ownedSlidePath("c1", `c1/${id}.gif`)).toBe(true);
  });

  it("відхиляє чужу кампанію, обхід шляху, вкладені шляхи й довільні імена", () => {
    expect(ownedSlidePath("c1", `c2/${id}.webp`)).toBe(false);
    expect(ownedSlidePath("c1", "c1/../c2/x.webp")).toBe(false);
    expect(ownedSlidePath("c1", `c1/sub/${id}.webp`)).toBe(false);
    expect(ownedSlidePath("c1", "c1/mirrored.png")).toBe(false);
    expect(ownedSlidePath("c1", `c1/${id}.svg`)).toBe(false);
    expect(ownedSlidePath("c1", null)).toBe(false);
  });

  it("slideObjectPath декодує ключ публічного URL", () => {
    expect(slideObjectPath(`https://p.supabase.co/storage/v1/object/public/scene-slides/c1/${id}.webp`)).toBe(`c1/${id}.webp`);
  });
});
