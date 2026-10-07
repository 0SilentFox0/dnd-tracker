import { describe, expect, it } from "vitest";

import { decodeImageDataUrl, findMissingKeys, planMissing } from "../wiki-icons-lib";

describe("wiki-icons lib", () => {
  it("skips keys whose file already exists", () => {
    const all = planMissing(new Set());

    const some = planMissing(new Set(["skill-icons/cleaving-strike.webp"]));

    expect(all.length - some.length).toBe(1);
    expect(some.find((d) => d.key === "cleaving-strike")).toBeUndefined();
  });

  it("puts branch keys in main-skill-icons", () => {
    expect(planMissing(new Set()).find((d) => d.key === "ranged-expert")?.dir).toBe("main-skill-icons");
  });

  it("decodes an image data URL to a Buffer", () => {
    expect(decodeImageDataUrl("data:image/webp;base64,aGVsbG8=").toString()).toBe("hello");
  });

  it("rejects non-image data URLs", () => {
    expect(() => decodeImageDataUrl("data:text/html;base64,aGVsbG8=")).toThrow();
    expect(() => decodeImageDataUrl("hello")).toThrow();
  });

  it("finds keys whose wiki file is absent from the bundle", () => {
    const planned = planMissing(new Set());

    const data = Object.fromEntries(planned.filter((d) => d.key !== "bullseye").map((d) => [d.file, "x"]));

    expect(findMissingKeys(planned, data).map((d) => d.key)).toEqual(["bullseye"]);
  });
});
