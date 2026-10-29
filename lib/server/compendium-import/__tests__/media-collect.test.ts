import { describe, expect, it } from "vitest";

import { adaptCompendium } from "../adapt";
import { collectEntryMedia } from "../media/collect";
import { MEDIA_LIMITS, mediaIdOf } from "../media/types";
import { normalizeMediaUrl } from "../media/url";
import sample from "./fixtures/media-sample.json";

const adapted = adaptCompendium(sample);

const media = (name: string) => adapted.entries.find((e) => e.name === name)?.media;

describe("normalizeMediaUrl", () => {
  it("accepts external https hrefs and bare strings", () => {
    expect(normalizeMediaUrl({ type: "external", url: "https://a.test/x.png" })).toEqual({ url: "https://a.test/x.png" });
    expect(normalizeMediaUrl("https://a.test/x.png")).toEqual({ url: "https://a.test/x.png" });
  });

  it("rejects internal, non-https, malformed and oversized values", () => {
    expect(normalizeMediaUrl({ type: "internal", path: "a.png" })).toEqual({ reason: "MEDIA_INTERNAL_PATH" });
    expect(normalizeMediaUrl("http://a.test/x.png")).toEqual({ reason: "MEDIA_HTTPS_ONLY" });
    expect(normalizeMediaUrl("not a url")).toEqual({ reason: "MEDIA_INVALID_URL" });
    expect(normalizeMediaUrl(42)).toEqual({ reason: "MEDIA_INVALID_URL" });
    expect(normalizeMediaUrl(`https://a.test/${"x".repeat(MEDIA_LIMITS.urlLength)}`)).toEqual({ reason: "MEDIA_INVALID_URL" });
  });

  it("derives a stable 24-hex id", () => {
    expect(mediaIdOf("https://a.test/x.png")).toMatch(/^[a-f0-9]{24}$/);
  });
});

describe("collectEntryMedia on adapted entries", () => {
  it("units: tokenHref wins over fluff, the rest is extra", () => {
    expect(media("Token Beast")).toEqual([
      { url: "https://img.test/token.png", role: "avatar", path: "monster[0].tokenHref" },
      { url: "https://img.test/fluff-a.png", role: "avatar", path: "monster[0].fluff.images[0]", skip: "MEDIA_EXTRA" },
    ]);
  });

  it("units: root monsterFluff matched by name and source", () => {
    expect(media("Fluff Beast")).toEqual([{ url: "https://img.test/fluff-b.png", role: "avatar", path: "monster[1].fluff.images[0]" }]);
  });

  it("internal href is skipped", () => {
    expect(media("Internal Beast")).toEqual([{ url: "", role: "avatar", path: "monster[2].tokenHref", skip: "MEDIA_INTERNAL_PATH" }]);
  });

  it("spells: foundryImg to icon; http is skipped", () => {
    expect(media("Img Spell")).toEqual([{ url: "https://img.test/spell.webp", role: "icon", path: "spell[0].foundryImg" }]);
    expect(media("Http Spell")?.[0]).toMatchObject({ role: "icon", skip: "MEDIA_HTTPS_ONLY" });
  });

  it("artifacts: first inline fluff image, second is extra", () => {
    expect(media("Two Images")).toEqual([
      { url: "https://img.test/i1.png", role: "icon", path: "item[0].fluff.images[0]" },
      { url: "https://img.test/i2.png", role: "icon", path: "item[0].fluff.images[1]", skip: "MEDIA_EXTRA" },
    ]);
  });

  it("races: raceFluff to icon", () => {
    expect(media("Fluffy Race")).toEqual([{ url: "https://img.test/race.png", role: "icon", path: "race[0].fluff.images[0]" }]);
  });

  it("nested subclass images are skipped as MEDIA_NESTED", () => {
    expect(media("Nested Path")).toEqual([{ url: "https://img.test/sub.png", role: "icon", path: "subclass[0].fluff.images[0]", skip: "MEDIA_NESTED" }]);
  });

  it("classes, feats and backgrounds read <kind>Fluff", () => {
    const root = { featFluff: [{ name: "F", source: "S", images: [{ href: { type: "external", url: "https://img.test/f.png" } }] }] };

    expect(collectEntryMedia("feats", "feat", { name: "F", source: "S" }, root, "feat[0]", false)).toHaveLength(1);
    expect(collectEntryMedia("classes", "class", { name: "F", source: "S" }, {}, "class[0]", false)).toEqual([]);
    expect(collectEntryMedia("scenarioPages", "bookChapter", { name: "F", source: "S" }, root, "x", false)).toEqual([]);
  });

  it("falls back to inherits.fluff", () => {
    const row = { name: "V", source: "S", inherits: { fluff: { images: [{ href: { type: "external", url: "https://img.test/v.png" } }] } } };

    expect(collectEntryMedia("artifacts", "magicvariant", row, {}, "magicvariant[0]", false)).toEqual([{ url: "https://img.test/v.png", role: "icon", path: "magicvariant[0].fluff.images[0]" }]);
  });
});

describe("unsupported()", () => {
  const codes = (row: Record<string, unknown>) => adaptCompendium({ feat: [{ name: "A", source: "S", ...row }] }).issues.map((i) => i.code);

  it("treats media fields as handled but still flags other foundry fields", () => {
    expect(codes({ fluff: { images: [] }, hasFluff: true, hasFluffImages: true, hasToken: true, foundryImg: "https://a.test/x.png", tokenHref: "https://a.test/y.png" })).not.toContain("MEDIA_OR_FOUNDRY_SKIPPED");
    expect(codes({ foundryAdvancement: [] })).toContain("MEDIA_OR_FOUNDRY_SKIPPED");
  });
});
