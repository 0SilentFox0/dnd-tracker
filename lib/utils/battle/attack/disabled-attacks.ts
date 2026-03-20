import type { BattleParticipant } from "@/types/battle";

/** Типи ефектів у `activeEffects[].effects[]`, що блокують кнопки атаки/магії */
export const DISABLE_MELEE_ATTACKS = "disable_melee_attacks";

export const DISABLE_RANGED_ATTACKS = "disable_ranged_attacks";

export const DISABLE_SPELL_CASTING = "disable_spell_casting";

export function getDisabledAttackKinds(participant: BattleParticipant): {
  melee: boolean;
  ranged: boolean;
  spellCasting: boolean;
} {
  const out = { melee: false, ranged: false, spellCasting: false };

  for (const ae of participant.battleData.activeEffects ?? []) {
    for (const d of ae.effects ?? []) {
      if (d.type === DISABLE_MELEE_ATTACKS) out.melee = true;

      if (d.type === DISABLE_RANGED_ATTACKS) out.ranged = true;

      if (d.type === DISABLE_SPELL_CASTING) out.spellCasting = true;
    }
  }

  return out;
}
