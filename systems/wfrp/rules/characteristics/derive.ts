import { modifiersOf } from "../corruption/modifiers";
import { skillAdvanceKey, skillDef } from "../skills/catalog";
import { type CharacteristicKey, type Characteristics, SKILL_ADVANCE_KEY_RE, SPEC_RE } from "./keys";

import type { HpBreakdownLine } from "@/lib/utils/characters/hero-hp";
import { sheetLineKey } from "@/lib/utils/characters/sheet/line-key";

export const value = (c: Characteristics, key: CharacteristicKey) => Math.max(1, c.base[key] + c.advances[key] + (modifiersOf(c.corruption).characteristics[key] ?? 0));

export const bonus = (c: Characteristics, key: CharacteristicKey) => Math.floor(value(c, key) / 10);

export const woundsMax = (c: Characteristics) => Math.max(1, bonus(c, "s") + 2 * bonus(c, "t") + bonus(c, "wp") + c.extraWounds * bonus(c, "t") + modifiersOf(c.corruption).maxWounds);

export const moveOf = (c: Characteristics) => Math.max(1, c.move + modifiersOf(c.corruption).move);

export const walkYards = (c: Characteristics) => moveOf(c) * 2;

export const runYards = (c: Characteristics) => moveOf(c) * 4;

export function skillTarget(c: Characteristics, skillKey: string, spec?: string): { target: number; trained: boolean; characteristic: CharacteristicKey; advances: number } | null {
  const def = skillDef(skillKey);

  if (!def) return null;

  if (def.spec === "none" && spec) return null;

  if (def.spec === "fixed" && (!spec || !def.specs?.includes(spec))) return null;

  if (def.spec === "open" && (!spec || !SPEC_RE.test(spec))) return null;

  const key = skillAdvanceKey(skillKey, spec);

  if (!SKILL_ADVANCE_KEY_RE.test(key)) return null;

  const advances = c.skillAdvances[key] ?? 0;

  const trained = def.kind === "basic" || (!!spec && !!def.basicSpecs?.includes(spec)) || advances > 0;

  const base = value(c, def.characteristic);

  return { target: trained ? base + advances : base, trained, characteristic: def.characteristic, advances };
}

export function woundsBreakdown(c: Characteristics): HpBreakdownLine[] {
  const tb = bonus(c, "t");

  const mutation = modifiersOf(c.corruption).maxWounds;

  return [{ label: sheetLineKey("wounds"), params: { sb: bonus(c, "s"), tb, wpb: bonus(c, "wp"), extra: c.extraWounds * tb } }, ...(mutation ? [{ label: sheetLineKey("woundsMutation"), params: { amount: mutation } }] : [])];
}
