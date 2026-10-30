import { expect, it } from "vitest";

import type { IconsFile } from "../../assets/tokens-5e/icons-file";
import { withIcons } from "../lib/load-template";
import type { SrdData } from "../lib/types";

const data = { units: [{ slug: "u1", name: "U1" }, { slug: "u2", name: "U2" }], spells: [{ slug: "s1", name: "S1" }], artifacts: [{ slug: "a1", name: "A1" }] } as unknown as SrdData;

const icons: IconsFile = { features: {}, races: {}, classes: {}, subclasses: {}, backgrounds: {}, spells: { s1: "https://x/s1.webp" }, units: { u1: "https://x/u1.webp" }, artifacts: { a1: "https://x/a1.webp" } };

const rows = (kind: "units" | "spells" | "artifacts") => (data[kind] as Array<{ slug: string; name: string }>).map(({ name }) => ({ name }));

it("units get avatar, spells and artifacts get icon, missing entries stay untouched", () => {
  expect(withIcons("units", data, rows("units"), icons)).toEqual([{ name: "U1", avatar: "https://x/u1.webp" }, { name: "U2" }]);
  expect(withIcons("spells", data, rows("spells"), icons)).toEqual([{ name: "S1", icon: "https://x/s1.webp" }]);
  expect(withIcons("artifacts", data, rows("artifacts"), icons)).toEqual([{ name: "A1", icon: "https://x/a1.webp" }]);
  expect(withIcons("races", data, [{ name: "R" }], icons)).toEqual([{ name: "R" }]);
});
