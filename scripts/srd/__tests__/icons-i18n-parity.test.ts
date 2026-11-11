import { expect, it } from "vitest";

import { expectedTargets, IDENTITY_BUCKET } from "../../assets/tokens-5e/identity-catalog";
import { withIcons } from "../../templates/lib/icons-file";
import { withClassIcons } from "../../templates/lib/import-prepare";
import type { IconsFile, PackRow } from "../../templates/lib/pack";
import { readSrdData, toImportRows } from "../lib/data-files";

const fakeIcons = (): IconsFile => {
  const icons: IconsFile = { features: {}, races: {}, classes: {}, subclasses: {}, backgrounds: {}, feats: {}, spells: {}, units: {}, artifacts: {} };

  for (const t of expectedTargets(readSrdData())) icons[t.kind][t.key] = `https://x/${IDENTITY_BUCKET[t.kind]}/${t.key.replace(/\//g, "_")}.webp`;

  return icons;
};

const flatten = (value: unknown, path = ""): Array<[string, string]> => {
  if (Array.isArray(value)) return value.flatMap((v, i) => flatten(v, `${path}[${i}]`));

  if (!value || typeof value !== "object") return [];

  return Object.entries(value).flatMap(([k, v]) => (k === "icon" && typeof v === "string" ? [[`${path}.icon`, v] as [string, string]] : flatten(v, path ? `${path}.${k}` : k)));
};

const iconPaths = (locale: string) => {
  const data = readSrdData(undefined, locale);

  const icons = fakeIcons();

  return (["races", "classes", "backgrounds", "feats"] as const).flatMap((kind) => {
    const merged = withIcons(toImportRows(data[kind]) as PackRow[], icons[kind]);

    return flatten(kind === "classes" ? withClassIcons(merged, icons) : merged, kind);
  });
};

it("en and uk produce the same icon URLs at the same positions", () => {
  const en = iconPaths("en");

  expect(en).toHaveLength(expectedTargets(readSrdData()).length);
  expect(iconPaths("uk")).toEqual(en);
});
