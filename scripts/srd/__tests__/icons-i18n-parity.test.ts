import { expect, it } from "vitest";

import type { IconsFile } from "../../assets/tokens-5e/icons-file";
import { expectedTargets, IDENTITY_BUCKET } from "../../assets/tokens-5e/identity-catalog";
import { readSrdData, toImportRows } from "../lib/data-files";
import { withClassIcons, withIcons } from "../lib/load-template";

const fakeIcons = (): IconsFile => {
  const icons: IconsFile = { features: {}, races: {}, classes: {}, subclasses: {}, backgrounds: {}, spells: {}, units: {}, artifacts: {} };

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

  return (["races", "classes", "backgrounds"] as const).flatMap((kind) => {
    const merged = withIcons(kind, data, toImportRows(data[kind]), icons);

    return flatten(kind === "classes" ? withClassIcons(merged, data, icons) : merged, kind);
  });
};

it("en and uk produce the same icon URLs at the same positions", () => {
  const en = iconPaths("en");

  expect(en).toHaveLength(expectedTargets(readSrdData()).length);
  expect(iconPaths("uk")).toEqual(en);
});
