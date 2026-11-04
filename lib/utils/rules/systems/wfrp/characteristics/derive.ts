import { skillAdvanceKey, skillDef } from "../skills/catalog";
import { type CharacteristicKey, type Characteristics, SKILL_ADVANCE_KEY_RE, SPEC_RE } from "./keys";

import type { HpBreakdownLine } from "@/lib/utils/characters/hero-hp";
import { sheetLineKey } from "@/lib/utils/characters/sheet/line-key";

export const value = (c: Characteristics, key: CharacteristicKey) => c.base[key] + c.advances[key];

export const bonus = (c: Characteristics, key: CharacteristicKey) => Math.floor(value(c, key) / 10);

export const woundsMax = (c: Characteristics) => bonus(c, "s") + 2 * bonus(c, "t") + bonus(c, "wp") + c.extraWounds * bonus(c, "t");

export const walkYards = (c: Characteristics) => c.move * 2;

export const runYards = (c: Characteristics) => c.move * 4;

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

  return [{ label: sheetLineKey("wounds"), params: { sb: bonus(c, "s"), tb, wpb: bonus(c, "wp"), extra: c.extraWounds * tb } }];
}
