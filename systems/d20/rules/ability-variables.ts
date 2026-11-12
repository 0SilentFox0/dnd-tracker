import type { AbilityKey } from "@/lib/constants/abilities";
import type { AbilityVariables } from "@/lib/utils/abilities/engine/core/variables";
import type { BattleParticipant } from "@/types/battle";

const mod = (key: AbilityKey) => (p: BattleParticipant) => p.abilities.modifiers[key];

export const D20_ABILITY_VARIABLES: AbilityVariables = {
  str_mod: mod("strength"),
  dex_mod: mod("dexterity"),
  con_mod: mod("constitution"),
  int_mod: mod("intelligence"),
  wis_mod: mod("wisdom"),
  cha_mod: mod("charisma"),
  prof: (p) => p.abilities.proficiencyBonus ?? 0,
};
