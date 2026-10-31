import { describe, expect, it } from "vitest";

import type { IconsFile } from "../../assets/tokens-5e/icons-file";
import { withClassIcons, withIcons } from "../lib/load-template";
import type { SrdData } from "../lib/types";

const data = {
  units: [{ slug: "u1", name: "U1" }, { slug: "u2", name: "U2" }],
  spells: [{ slug: "s1", name: "S1" }],
  artifacts: [{ slug: "a1", name: "A1" }],
  races: [{ slug: "r1" }],
  classes: [{ slug: "c1" }],
  backgrounds: [{ slug: "b1" }],
} as unknown as SrdData;

const icons: IconsFile = {
  features: { "c1/rage-1": "https://x/f1.webp", "c1/sc/sf-3": "https://x/f2.webp" },
  races: { r1: "https://x/r1.webp" },
  classes: { c1: "https://x/c1.webp" },
  subclasses: { "c1/sc": "https://x/sc.webp" },
  backgrounds: { b1: "https://x/b1.webp" },
  spells: { s1: "https://x/s1.webp" },
  units: { u1: "https://x/u1.webp" },
  artifacts: { a1: "https://x/a1.webp" },
};

const rows = (kind: "units" | "spells" | "artifacts") => (data[kind] as Array<{ slug: string; name: string }>).map(({ name }) => ({ name }));

it("units get avatar, spells and artifacts get icon, missing entries stay untouched", () => {
  expect(withIcons("units", data, rows("units"), icons)).toEqual([{ name: "U1", avatar: "https://x/u1.webp" }, { name: "U2" }]);
  expect(withIcons("spells", data, rows("spells"), icons)).toEqual([{ name: "S1", icon: "https://x/s1.webp" }]);
  expect(withIcons("artifacts", data, rows("artifacts"), icons)).toEqual([{ name: "A1", icon: "https://x/a1.webp" }]);
  expect(withIcons("feats", data, [{ name: "F" }], icons)).toEqual([{ name: "F" }]);
});

it("races, classes and backgrounds get icon", () => {
  expect(withIcons("races", data, [{ name: "R" }], icons)).toEqual([{ name: "R", icon: "https://x/r1.webp" }]);
  expect(withIcons("classes", data, [{ name: "C" }], icons)).toEqual([{ name: "C", icon: "https://x/c1.webp" }]);
  expect(withIcons("backgrounds", data, [{ name: "B" }], icons)).toEqual([{ name: "B", icon: "https://x/b1.webp" }]);
});

describe("withClassIcons", () => {
  const row = () => ({
    name: "C",
    features: [{ level: 1, abilities: [{ id: "rage-1", name: "Rage" }] }],
    subclasses: [{ id: "sc", name: "SC", features: [{ level: 3, abilities: [{ id: "sf-3" }, { id: "c1-subclass-3" }] }] }],
  });

  it("sets icons on features, subclass features and subclasses, leaves placeholders", () => {
    const input = [row()];

    const snapshot = structuredClone(input);

    const [out] = withClassIcons(input, data, icons) as ReturnType<typeof row>[];

    expect(out.features[0].abilities[0]).toEqual({ id: "rage-1", name: "Rage", icon: "https://x/f1.webp" });
    expect(out.subclasses[0]).toMatchObject({ icon: "https://x/sc.webp" });
    expect(out.subclasses[0].features[0].abilities).toEqual([{ id: "sf-3", icon: "https://x/f2.webp" }, { id: "c1-subclass-3" }]);
    expect(input).toEqual(snapshot);
  });

  it("throws on length mismatch", () => {
    expect(() => withClassIcons([], data, icons)).toThrow();
  });
});
