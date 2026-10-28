import { describe, expect, it } from "vitest";

import { assertAttachAllowed, assetKey, fileKeys, matchAssets, objectPath, srdSlugNames } from "../attach-lib";

const names = [
  { id: "u1", name: "Adult Red Dragon" },
  { id: "s1", name: "Fireball" },
  { id: "s2", name: "Hunter's Mark" },
  { id: "u2", name: "Goblin" },
  { id: "s3", name: "Вогняна куля" },
  { id: "s4", name: "Dragon: Red Wyrm" },
];

const slugNames = new Map([
  ["srd-2024_hunters-mark", "Hunter's Mark"],
  ["srd-2024_adult-red-dragon", "Adult Red Dragon"],
]);

describe("assetKey / fileKeys", () => {
  it("punctuation-insensitive, Unicode-safe", () => {
    expect(assetKey("Hunter's  Mark")).toBe("hunter s mark");
    expect(assetKey("Hunter’s_Mark")).toBe("hunter s mark");
    expect(assetKey("Dragon: Red-Wyrm")).toBe("dragon red wyrm");
    expect(assetKey("Вогняна_Куля")).toBe("вогняна куля");
    expect(assetKey("Blindness/Deafness")).toBe(assetKey("Blindness_Deafness"));
  });

  it("variant suffixes are stripped after the full key", () => {
    expect(fileKeys("Adult_Red_Dragon_A1.webp")).toEqual(["adult red dragon a1", "adult red dragon"]);
    expect(fileKeys("Goblin-b2.png")).toEqual(["goblin b2", "goblin"]);
    expect(fileKeys("srd-2024_fireball.webp")).toEqual(["srd 2024 fireball"]);
  });
});

describe("matchAssets", () => {
  it("by name, by SRD slug (with or without the prefix), variants, colon and Cyrillic; first variant wins", () => {
    const files = ["Goblin_B2.png", "Adult_Red_Dragon_A1.webp", "srd-2024_fireball.webp", "hunters-mark.png", "Goblin_A1.png", "Вогняна_куля.png", "dragon-red-wyrm.png", "Unknown.png"];

    const { matches, unmatched, duplicates } = matchAssets(files, names, new Map([...slugNames, ["srd-2024_fireball", "Fireball"]]));

    expect(Object.fromEntries(matches.map((m) => [m.file, m.name]))).toEqual({
      "Adult_Red_Dragon_A1.webp": "Adult Red Dragon",
      "Goblin_A1.png": "Goblin",
      "hunters-mark.png": "Hunter's Mark",
      "srd-2024_fireball.webp": "Fireball",
      "Вогняна_куля.png": "Вогняна куля",
      "dragon-red-wyrm.png": "Dragon: Red Wyrm",
    });
    expect(duplicates).toEqual(["Goblin_B2.png"]);
    expect(unmatched).toEqual(["Unknown.png"]);
  });

  it("without slug data hunters-mark.png stays unmatched, Hunter's_Mark.png matches by name", () => {
    expect(matchAssets(["hunters-mark.png"], names).unmatched).toEqual(["hunters-mark.png"]);
    expect(matchAssets(["Hunter's_Mark.png"], names).matches[0]?.id).toBe("s2");
    expect(matchAssets(["adult-red-dragon.png"], names).matches[0]?.id).toBe("u1");
    expect(matchAssets(["srd-2024_adult-red-dragon.png"], names, slugNames).matches[0]?.id).toBe("u1");
  });
});

describe("srdSlugNames", () => {
  it("maps slugs of an SRD kind; kinds outside the SRD data give an empty map", () => {
    const data = { units: [{ slug: "srd-2024_bat", name: "Bat" }] } as never;

    expect(srdSlugNames("units", data)).toEqual(new Map([["srd-2024_bat", "Bat"]]));
    expect(srdSlugNames("skills", data).size).toBe(0);
    expect(srdSlugNames("main-skills", data).size).toBe(0);
  });
});

describe("assertAttachAllowed", () => {
  it("refuses the official template without --allow-official", () => {
    expect(() => assertAttachAllowed({ kind: "template", visibility: "official" }, false)).toThrow(/--allow-official/);
    expect(() => assertAttachAllowed({ kind: "template", visibility: "official" }, true)).not.toThrow();
    expect(() => assertAttachAllowed({ kind: "campaign", visibility: "private" }, false)).not.toThrow();
  });
});

describe("objectPath", () => {
  it("is stable per content and safe for Cyrillic names", () => {
    const a = objectPath("c1", "spells", "Hunter's Mark", Buffer.from("x"), ".png");

    expect(a).toMatch(/^c1\/spells\/hunter-s-mark-[0-9a-f]{8}\.png$/);
    expect(objectPath("c1", "spells", "Hunter's Mark", Buffer.from("x"), ".png")).toBe(a);
    expect(objectPath("c1", "spells", "Hunter's Mark", Buffer.from("y"), ".png")).not.toBe(a);
    expect(objectPath("c1", "main-skills", "Вогняна куля", Buffer.from("x"), ".png")).toMatch(/^c1\/main-skills\/asset-[0-9a-f]{8}\.png$/);
  });
});
