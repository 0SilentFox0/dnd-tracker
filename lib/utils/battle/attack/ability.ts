import { ABILITY_LABELS, type AbilityKey } from "@/lib/constants/abilities";
import { AttackType } from "@/lib/constants/battle";
import type { WeaponTrait } from "@/lib/constants/weapon-traits";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { attackAbilityKey, attackAbilityLabel, getAbilityModifier, getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import type { BattleAttack, BattleParticipant } from "@/types/battle";

export const isFiveE = (p: BattleParticipant): boolean => p.abilities.damageModel === "5e";

export const hasTrait = (a: Pick<BattleAttack, "traits">, t: WeaponTrait): boolean => !!a.traits?.includes(t);

const modOf = (p: BattleParticipant, key: AbilityKey) => getAbilityModifier(p.abilities[key] ?? 10);

/** HOMM — attackAbilityKey; 5e — finesse: більша з Сил/Спр, дальня (не метальна ближня) — Спр, ближня — Сил. */
export function attackAbilityFor(p: BattleParticipant, attack: BattleAttack): AbilityKey {
  if (!isFiveE(p)) return attackAbilityKey(p.abilities, attack.type);

  if (hasTrait(attack, "finesse")) return modOf(p, "dexterity") > modOf(p, "strength") ? "dexterity" : "strength";

  return attack.type === AttackType.RANGED ? "dexterity" : "strength";
}

/** Модифікатор до кидка атаки (друга рука — повний). */
export function attackRollModifier(p: BattleParticipant, attack: BattleAttack): number {
  if (!isFiveE(p)) return getAttackAbilityModifier(p.abilities, attack.type);

  return modOf(p, attackAbilityFor(p, attack));
}

/** Модифікатор до шкоди: друга рука 5e — min(mod, 0), якщо немає прапорця twoWeaponFighting. */
export function attackDamageModifier(p: BattleParticipant, attack: BattleAttack, participants: BattleParticipant[] = [p]): number {
  const mod = attackRollModifier(p, attack);

  if (!isFiveE(p) || attack.hand !== "off" || mod <= 0) return mod;

  return findFlags(withSelf(participants, p), p.basicInfo.id, "twoWeaponFighting").length > 0 ? mod : 0;
}

export function attackAbilityLabelFor(p: BattleParticipant, attack: BattleAttack): string {
  if (!isFiveE(p)) return attackAbilityLabel(p.abilities, attack.type);

  return ABILITY_LABELS[attackAbilityFor(p, attack)];
}
