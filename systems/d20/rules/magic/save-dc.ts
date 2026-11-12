import type { AbilityKey } from "@/lib/constants/abilities";
import { getSpellSaveDC } from "@/lib/utils/common/calculations";
import type { BattleParticipant } from "@/types/battle";

export function d20SpellSaveDc(caster: BattleParticipant, ability: AbilityKey | undefined, base: number): number {
  const casting = ability ?? caster.spellcasting?.spellcastingAbility;

  const computed = getSpellSaveDC(caster.abilities.proficiencyBonus, casting ? caster.abilities.modifiers[casting] : 0, base);

  return ability ? computed : (caster.spellcasting.spellSaveDC ?? computed);
}
