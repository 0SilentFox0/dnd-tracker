import { describe, expect, it } from "vitest";

import { contrastTextColor, normalizeHexColor } from "../contrast-text-color";

describe("contrast-safe foregrounds", () => {
  it("chooses black or white according to WCAG contrast", () => {
    expect(contrastTextColor("#123456")).toBe("#ffffff");
    expect(contrastTextColor("#777777")).toBe("#000000");
  });

  it("normalizes three-digit colors and replaces malformed values", () => {
    expect(normalizeHexColor("#abc")).toBe("#aabbcc");
    expect(normalizeHexColor("papayawhip")).toBe("#2a2018");
  });

  it.each(["#000000", "#ffffff", "#777777", "#123456", "#ff0000", "#00ff00", "#0000ff", "#abcabc"])("keeps text on %s at WCAG AA contrast", (background) => {
    const foreground = contrastTextColor(background);

    const luminance = (hex: string) => {
      const pairs = hex.slice(1).match(/[\da-f]{2}/gi) ?? [];

      const channels = pairs.map((value) => parseInt(value, 16) / 255);

      const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);

      return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
    };

    const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);

    expect((lighter + 0.05) / (darker + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
});
