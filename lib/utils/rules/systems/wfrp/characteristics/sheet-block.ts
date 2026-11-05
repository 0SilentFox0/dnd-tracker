import type { SheetBlockInput, SheetWfrpBlock } from "../../types";
import { parseSkillAdvanceKey, SKILL_CATALOG, skillAdvanceKey, skillDef } from "../skills/catalog";
import { bonus, runYards, skillTarget, value, walkYards, woundsBreakdown, woundsMax } from "./derive";
import { CHARACTERISTIC_KEYS } from "./keys";

export function wfrpSheetBlock({ characteristics: c, resources }: SheetBlockInput): SheetWfrpBlock {
  const entries = new Map<string, { key: string; spec?: string }>();

  const add = (key: string, spec?: string) => entries.set(skillAdvanceKey(key, spec), { key, ...(spec && { spec }) });

  for (const def of SKILL_CATALOG) {
    if (def.spec === "none") add(def.key);

    for (const spec of def.basicSpecs ?? []) add(def.key, spec);
  }

  for (const advanceKey of Object.keys(c.skillAdvances)) {
    const { key, spec } = parseSkillAdvanceKey(advanceKey);

    add(key, spec);
  }

  const skills = [...entries.values()].flatMap(({ key, spec }) => {
    const t = skillTarget(c, key, spec);

    const def = skillDef(key);

    return t && def ? [{ key, ...(spec && { spec }), characteristic: t.characteristic, target: t.target, advances: t.advances, trained: t.trained, kind: def.kind }] : [];
  });

  skills.sort((a, b) => Number(b.trained) - Number(a.trained) || `${a.key}:${a.spec ?? ""}`.localeCompare(`${b.key}:${b.spec ?? ""}`));

  return {
    characteristics: CHARACTERISTIC_KEYS.map((key) => ({ key, base: c.base[key], advances: c.advances[key], value: value(c, key), bonus: bonus(c, key) })),
    wounds: { max: woundsMax(c), breakdown: woundsBreakdown(c) },
    move: { value: c.move, walkYd: walkYards(c), runYd: runYards(c) },
    skills,
    fate: c.fate,
    fortune: resources.fortune ?? c.fate,
    sin: resources.sin ?? 0,
  };
}
