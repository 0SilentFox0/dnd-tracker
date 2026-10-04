import { describe, expect,it } from "vitest";

import { isSupabaseStorageUrl, normalizeImageUrl } from "../image-url";

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
