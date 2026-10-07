import { parseArtifactSetBonus } from "./artifact-set-bonus";
import { mapBonuses, mapModifiers, mapPassiveEffects, scopeOf, withTarget } from "./convert-artifact";
import type { ConversionIssue, ConversionResult, ConvertOptions } from "./types";

import type { Effect } from "@/lib/utils/abilities/schema";
import { isRecord } from "@/lib/utils/common/is-record";


export function convertLegacyArtifactSet(row: { id: string; name: string; setBonus: unknown }, opts: ConvertOptions = {}): ConversionResult {
  const issues: ConversionIssue[] = [];

  const skipBaked = opts.skipBakedStats === true;

  const parsed = parseArtifactSetBonus(row.setBonus);

  const scope = scopeOf(isRecord(row.setBonus) ? row.setBonus.effectScope : undefined);

  const effects: Effect[] = [
    ...mapBonuses(parsed.bonuses, skipBaked, issues),
    ...mapModifiers(parsed.modifiers, { skipBaked, skipTargets: false }, issues),
  ];

  if (!skipBaked) {
    for (const [level, n] of Object.entries(parsed.spellSlotBonus)) {
      if (n) effects.push({ kind: "modifyStat", stat: "spellSlots", spellLevels: [Number(level)], flat: n });
    }
  }

  effects.push(...mapPassiveEffects(parsed.passiveEffects, skipBaked, issues));

  if (scope.immuneSpellIds.length) effects.push({ kind: "flag", flag: "spellImmunity", spellIds: scope.immuneSpellIds });

  return {
    abilities: effects.length ? [{ id: "set", name: row.name, trigger: { event: "passive" }, effects: withTarget(effects, scope.target) }] : [],
    issues,
  };
}
