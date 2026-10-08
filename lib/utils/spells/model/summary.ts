import { costLabel, resolutionLabel, targetingLabel } from "./labels";
import { readSpellDefinition } from "./read";

import type { Spell } from "@/types/spells";

/** Короткі підписи механіки заклинання для карток DM: ціль, кубики, перевірка, вартість. */
export function spellMechanicsLabels(spell: Spell): string[] {
  const def = readSpellDefinition({ id: spell.id, dice: spell.dice, cost: spell.cost, targeting: spell.targeting, resolution: spell.resolution, spellEffects: spell.spellEffects, raceModifiers: spell.raceModifiers });

  return [
    targetingLabel(def.targeting),
    def.dice > 0 ? `${def.dice}к` : "без кубиків",
    ...(def.resolution.kind === "save" ? [resolutionLabel(def.resolution)] : []),
    ...(def.cost === "bonusAction" ? [costLabel(def.cost)] : []),
  ];
}
