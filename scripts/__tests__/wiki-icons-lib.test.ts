import { describe, expect, it } from "vitest";

import { SPELL_ICONS } from "../../data/skill-icons";
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

  it("plans every library spell icon into spell-icons by spell key", () => {
    const planned = planMissing(new Set()).filter((d) => d.dir === "spell-icons");

    expect(planned).toHaveLength(Object.keys(SPELL_ICONS).length);
    expect(planned.find((d) => d.key === "eternal-light")).toMatchObject({ file: SPELL_ICONS["eternal-light"] });
    expect(planMissing(new Set(["spell-icons/haste.webp"])).some((d) => d.dir === "spell-icons" && d.key === "haste")).toBe(false);
  });

  it("decodes an image data URL to a Buffer", () => {
    expect(decodeImageDataUrl("data:image/webp;base64,aGVsbG8=").toString()).toBe("hello");
  });

  it("rejects non-webp data URLs", () => {
    expect(() => decodeImageDataUrl("data:text/html;base64,aGVsbG8=")).toThrow();
    expect(() => decodeImageDataUrl("hello")).toThrow();
    expect(() => decodeImageDataUrl("data:image/png;base64,aGVsbG8=")).toThrow();
  });

  it("finds keys whose wiki file is absent from the bundle", () => {
    const planned = planMissing(new Set());

    const data = Object.fromEntries(planned.filter((d) => d.key !== "bullseye").map((d) => [d.file, "x"]));

    expect(findMissingKeys(planned, data).map((d) => d.key)).toEqual(["bullseye"]);
  });
});
