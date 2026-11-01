import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(process.cwd(), "app/palettes.css"), "utf8");

function paletteTokens(id: string): Record<string, string> {
  const block = css.match(new RegExp(`html\\[data-palette="${id}"\\]\\s*\\{([^}]*)\\}`))?.[1];

  if (!block) throw new Error(`Missing CSS token block for palette ${id}`);

  return Object.fromEntries([...block.matchAll(/(--[\w-]+)\s*:\s*(#[\da-f]{6})\b/gi)].map(([, name, value]) => [name, value]));
}

function luminance(hex: string): number {
  const pairs = hex.slice(1).match(/[\da-f]{2}/gi);

  const channels = pairs?.map((value) => parseInt(value, 16) / 255);

  if (!channels || channels.length !== 3) throw new Error(`Expected a six-digit hex color, received ${hex}`);

  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);

  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
}

function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);

  return (lighter + 0.05) / (darker + 0.05);
}

function mix(first: string, second: string, firstWeight: number): string {
  const firstChannels = first.slice(1).match(/[\da-f]{2}/gi)?.map((value) => parseInt(value, 16)) ?? [];

  const secondChannels = second.slice(1).match(/[\da-f]{2}/gi)?.map((value) => parseInt(value, 16)) ?? [];

  return `#${firstChannels.map((channel, index) => Math.round(channel * firstWeight + (secondChannels[index] ?? 0) * (1 - firstWeight)).toString(16).padStart(2, "0")).join("")}`;
}

const PALETTES = ["tavern", "midnight", "forest", "parchment", "amethyst", "frost"];

const HUD_SURFACES = ["--palette-background", "--palette-card", "--palette-secondary", "--palette-page", "--hud-field"];

const HUD_TEXT = ["--palette-foreground", "--hud-ink", "--hud-bone", "--hud-muted", "--hud-gold", "--hud-gold-bright", "--hud-gold-strong", "--hud-danger", "--hud-bad", "--hud-good", "--hud-good-dim", "--hud-info"];

describe.each(PALETTES)("%s palette WCAG contrast", (id) => {
  const tokens = paletteTokens(id);

  it("keeps every shared HUD text token at AA contrast on its palette surfaces", () => {
    const failures = HUD_TEXT.flatMap((textToken) => HUD_SURFACES.flatMap((surfaceToken) => {
      const ratio = contrastRatio(tokens[textToken], tokens[surfaceToken]);

      return ratio < 4.5 ? [`${textToken} on ${surfaceToken}: ${ratio.toFixed(2)}:1`] : [];
    })).concat(contrastRatio(tokens["--palette-primary-foreground"], tokens["--hud-gold"]) < 4.5
      ? [`--palette-primary-foreground on --hud-gold: ${contrastRatio(tokens["--palette-primary-foreground"], tokens["--hud-gold"]).toFixed(2)}:1`]
      : []);

    expect(failures).toEqual([]);
  });

  it("keeps book text at AA contrast on the page and cover", () => {
    const pairs = [
      ["--book-ink", "--book-page"],
      ["--book-muted", "--book-page"],
      ["--book-quiet", "--book-page"],
      ["--book-accent-ink", "--book-page"],
      ["--book-page", "--book-accent"],
      ["--book-cover-ink", "--book-cover"],
      ["--book-cover-muted", "--book-cover"],
    ] as const;

    const failures = pairs.flatMap(([textToken, surfaceToken]) => {
      const ratio = contrastRatio(tokens[textToken], tokens[surfaceToken]);

      return ratio < 4.5 ? [`${textToken} on ${surfaceToken}: ${ratio.toFixed(2)}:1`] : [];
    });

    expect(failures).toEqual([]);
  });

  it("keeps book text readable on selected and preview surfaces", () => {
    const choice = mix(tokens["--book-page"], tokens["--book-choice"], 0.84);

    const widening = mix(tokens["--book-page"], tokens["--book-accent"], 0.9);

    const pill = mix(tokens["--book-page"], tokens["--book-accent"], 0.93);

    const previewRow = mix(tokens["--book-page"], tokens["--book-accent"], 0.88);

    const pairs = [
      ["--book-ink", choice],
      ["--book-accent-ink", widening],
      ["--book-accent-ink", pill],
      ["--book-ink", previewRow],
    ] as const;

    const failures = pairs.flatMap(([textToken, surface]) => {
      const ratio = contrastRatio(tokens[textToken], surface);

      return ratio < 4.5 ? [`${textToken} on ${surface}: ${ratio.toFixed(2)}:1`] : [];
    });

    expect(failures).toEqual([]);
  });

  it("keeps palette control borders at non-text AA contrast", () => {
    const failures = ["--hud-line", "--hud-rule"].flatMap((borderToken) => HUD_SURFACES.flatMap((surfaceToken) => {
      const ratio = contrastRatio(tokens[borderToken], tokens[surfaceToken]);

      return ratio < 3 ? [`${borderToken} against ${surfaceToken}: ${ratio.toFixed(2)}:1`] : [];
    }));

    expect(failures).toEqual([]);
  });

  it("keeps book rules and outlined controls at non-text AA contrast", () => {
    const line = mix(tokens["--book-page"], tokens["--book-ink"], 0.35);

    const coverOutline = mix(tokens["--book-cover"], tokens["--book-cover-ink"], 0.3);

    const previewRow = mix(tokens["--book-page"], tokens["--book-accent"], 0.88);

    const previewPill = mix(tokens["--book-page"], tokens["--book-accent"], 0.93);

    const widening = mix(tokens["--book-page"], tokens["--book-accent"], 0.9);

    const failures = [
      ["book rule", line, tokens["--book-page"]],
      ["book outline", line, tokens["--book-page"]],
      ["preview health track", line, tokens["--book-page"]],
      ["dialog cover outline", coverOutline, tokens["--book-cover"]],
      ["book action outline", mix(tokens["--book-accent"], tokens["--book-page"], 0.25), tokens["--book-accent"]],
      ["preview row outline", mix(previewRow, tokens["--book-ink"], 0.15), previewRow],
      ["preview row inset outline", mix(previewRow, tokens["--book-ink"], 0.35), previewRow],
      ["preview pill outline", mix(previewPill, tokens["--book-accent"], 0.15), previewPill],
      ["widening outline", mix(widening, tokens["--book-accent"], 0.15), widening],
    ].flatMap(([name, first, second]) => {
      const ratio = contrastRatio(first, second);

      return ratio < 3 ? [`${name}: ${ratio.toFixed(2)}:1`] : [];
    });

    expect(failures).toEqual([]);
  });
});
