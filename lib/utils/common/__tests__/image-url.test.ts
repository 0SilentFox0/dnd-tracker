import { afterEach, describe, expect, it, vi } from "vitest";

import { isBundledStaticAsset, isHttpUrl, isSharedAssetUrl, isSupabaseStorageUrl, normalizeImageUrl, sharedAssetPath } from "../image-url";

describe("normalizeImageUrl", () => {
  it("повертає той самий URL для не-wikia", () => {
    const url = "https://example.com/image.png";

    expect(normalizeImageUrl(url)).toBe(url);
  });

  it("нормалізує wikia URL: додає revision/latest та path-prefix", () => {
    const url = "https://static.wikia.nocookie.net/dnd/images/1/1a/Icon.png";

    const result = normalizeImageUrl(url);

    expect(result).toContain("/revision/latest");
    expect(result).toContain("path-prefix");
  });

  it("залишає URL без змін якщо вже є revision/latest і path-prefix", () => {
    const url =
      "https://static.wikia.nocookie.net/dnd/images/1/1a/Icon.png/revision/latest?path-prefix=en";

    expect(normalizeImageUrl(url)).toBe(url);
  });

  it("повертає оригінал при невалідному URL", () => {
    const invalid = "not-a-url";

    expect(normalizeImageUrl(invalid)).toBe(invalid);
  });
});

describe("isSupabaseStorageUrl", () => {
  it("true для публічного об'єкта Supabase Storage", () => {
    expect(
      isSupabaseStorageUrl(
        "https://mpvcaxsukbwzgrbvzmjj.supabase.co/storage/v1/object/public/spell-icons/fireball.png",
      ),
    ).toBe(true);
  });

  it("false для іншого хоста", () => {
    expect(
      isSupabaseStorageUrl("https://static.wikia.nocookie.net/x/images/a.png/revision/latest"),
    ).toBe(false);
  });

  it("false для хоста, що лише містить supabase.co", () => {
    expect(
      isSupabaseStorageUrl("https://evil-supabase.co.example.com/storage/v1/object/public/a.png"),
    ).toBe(false);
  });

  it("false для не-public шляху Supabase", () => {
    expect(
      isSupabaseStorageUrl("https://abc.supabase.co/storage/v1/object/sign/a.png?token=x"),
    ).toBe(false);
  });

  it("false для відносного шляху і data URL", () => {
    expect(isSupabaseStorageUrl("/screen-bg/battle-bg.jpg")).toBe(false);
    expect(isSupabaseStorageUrl("data:image/png;base64,AAAA")).toBe(false);
  });
});

describe("isHttpUrl", () => {
  it("true для http(s) з хостом", () => {
    expect(isHttpUrl("https://example.com/a.png")).toBe(true);
    expect(isHttpUrl(" http://example.com/a.png ")).toBe(true);
  });

  it("false для порожнього, відносного, data: і без хоста", () => {
    expect(isHttpUrl("")).toBe(false);
    expect(isHttpUrl("/screen-bg/a.jpg")).toBe(false);
    expect(isHttpUrl("data:image/png;base64,AAAA")).toBe(false);
    expect(isHttpUrl("https://")).toBe(false);
    expect(isHttpUrl("abc")).toBe(false);
  });
});

describe("isBundledStaticAsset", () => {
  it("accepts bundled public images and rejects other paths and hosts", () => {
    expect(isBundledStaticAsset("/example-demo/maps/briarwood.svg")).toBe(true);
    expect(isBundledStaticAsset("/battle-maps/nicolas-tomb.webp")).toBe(true);
    expect(isBundledStaticAsset("/example-demo/maps/../secret.svg")).toBe(false);
    expect(isBundledStaticAsset("/other/map.svg")).toBe(false);
    expect(isBundledStaticAsset("https://evil.example/example-demo/maps/a.svg")).toBe(false);
  });
});

describe("sharedAssetPath", () => {
  it("будує шлях sets/<slug>/<hash><ext>", () => {
    expect(sharedAssetPath("5e SRD 5.2", "abc", ".webp")).toBe("sets/5e-srd-5-2/abc.webp");
  });

  it("порожній slug замінюється на set", () => {
    expect(sharedAssetPath("Вогонь", "abc", ".png")).toBe("sets/set/abc.png");
  });
});

describe("isSharedAssetUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  const base = "https://proj.supabase.co/storage/v1/object/public";

  it("true для public URL нашого проєкту під sets/", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    expect(isSharedAssetUrl(`${base}/unit-icons/sets/5e-srd-5-2/abc.webp`)).toBe(true);
  });

  it("false для {campaignId}/… та чужого хоста", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    expect(isSharedAssetUrl(`${base}/unit-icons/cmabc/units/goblin-1234.webp`)).toBe(false);
    expect(isSharedAssetUrl("https://other.supabase.co/storage/v1/object/public/unit-icons/sets/x/a.webp")).toBe(false);
    expect(isSharedAssetUrl("not a url")).toBe(false);
  });
});
