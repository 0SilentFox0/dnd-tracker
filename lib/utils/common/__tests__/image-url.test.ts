import { describe, it, expect } from "vitest";
import { normalizeImageUrl } from "../image-url";

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
