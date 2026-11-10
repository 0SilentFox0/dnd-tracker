import { describe, expect, it } from "vitest";

import { templateTranslationsFor } from "@/lib/server/templates/dictionaries";

describe("templateTranslationsFor", () => {
  it("loads the uk dictionary of a pack", async () => {
    expect(Object.keys(await templateTranslationsFor("srd-5.2", "uk")).length).toBeGreaterThan(0);
  });

  it("is empty for the canonical locale and unknown packs", async () => {
    expect(await templateTranslationsFor("srd-5.2", "en")).toEqual({});
    expect(await templateTranslationsFor("nope", "uk")).toEqual({});
    expect(await templateTranslationsFor("toString", "uk")).toEqual({});
  });
});
