import type { AttackType } from "@/lib/constants/battle";
import { AttackType as AttackTypeValue } from "@/lib/constants/battle";
import { BATTLE_RACE } from "@/lib/constants/battle";
import { getHeroDamageDiceForLevel } from "@/lib/constants/hero-scaling";
import { collectModifiers, statWithModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/participants";
import { getDiceAverage } from "@/lib/utils/battle/balance/dice";
import { getDiceSlots, mergeDiceFormulas } from "@/lib/utils/battle/balance/dice";
import { calculateDamageWithModifiersImpl } from "@/lib/utils/battle/damage/impl";
import { getAttackAbilityModifier } from "@/lib/utils/common/calculations";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAction, BattleAttack, BattleParticipant } from "@/types/battle";

export type SpellTier = "iron" | "bronze" | "silver" | "gold" | "mithril" | "platinum";

const TIERS: SpellTier[] = ["iron", "bronze", "silver", "gold", "mithril", "platinum"];

export const ROMAN = ["0", "I", "II", "III", "IV", "V"] as const;

export function spellTier(level: number): SpellTier {
  return TIERS[Math.max(0, Math.min(5, level))];
}

export function slotLevels(p: BattleParticipant): { level: 1 | 2 | 3 | 4 | 5; max: number; current: number }[] {
  return ([1, 2, 3, 4, 5] as const).map((level) => {
    const s = p.spellcasting?.spellSlots?.[String(level)];

    return { level, max: s?.max ?? 0, current: s?.current ?? 0 };
  });
}

export interface AbilityCharge {
  key: string;
  name: string;
  icon?: string | null;
  left: number;
  limit: number;
  per: "battle" | "round" | "turn";
}

export function abilityCharges(p: BattleParticipant): AbilityCharge[] {
  return (p.battleData.resolvedAbilities ?? []).flatMap((a) => {
    if (a.trigger.event !== "bonusAction" || !a.limits) return [];

    const per = a.limits.perBattle ? "battle" : a.limits.perRound ? "round" : a.limits.perTurn ? "turn" : null;

    if (!per) return [];

    const limit = (per === "battle" ? a.limits.perBattle : per === "round" ? a.limits.perRound : a.limits.perTurn) as number;

    const used = p.battleData.abilityUsage?.[a.key]?.[per] ?? 0;

    return [{ key: a.key, name: a.name, icon: a.source.icon ?? undefined, left: Math.max(0, limit - used), limit, per }];
  });
}

export function effectiveArmorClass(p: BattleParticipant, all: BattleParticipant[]): number {
  return statWithModifiers(withSelf(all, p), p.basicInfo.id, "armor", p.combatStats.armorClass);
}

const HOSTILE = new Set(["dealDamage", "dot", "applyCondition"]);

export function bonusTargetSide(a: ResolvedAbility): "ally" | "enemy" | null {
  const aimed = a.effects.filter((e) => "target" in e && e.target === "eventTarget");

  if (aimed.length === 0) return null;

  const hostile = aimed.some((e) =>
    HOSTILE.has(e.kind) || (("flat" in e && typeof e.flat === "number" && e.flat < 0) || ("percent" in e && typeof e.percent === "number" && e.percent < 0)),
  );

  return hostile ? "enemy" : "ally";
}

export function lastAction(log: BattleAction[]): BattleAction | null {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    if (log[i].actionType !== "end_turn") return log[i];
  }

  return null;
}

export function needsMoraleCheck(p: BattleParticipant, pendingMoraleCheck: unknown): boolean {
  if ((pendingMoraleCheck as { participantId?: string } | null)?.participantId === p.basicInfo.id) return false;

  const race = p.abilities.race?.toLowerCase() ?? "";

  if (race === BATTLE_RACE.NECROMANCER) return false;

  const morale = race === BATTLE_RACE.HUMAN && p.combatStats.morale < 0 ? 0 : p.combatStats.morale;

  return morale !== 0;
}

export function attackDamageFormula(p: BattleParticipant, attack: BattleAttack): string {
  const weapon = attack.damageDice ?? "";

  return p.basicInfo.sourceType === "character"
    ? mergeDiceFormulas(weapon, getHeroDamageDiceForLevel(p.abilities.level, attack.type as AttackType))
    : weapon;
}

export function weaponPreview(p: BattleParticipant, attack: BattleAttack, all: BattleParticipant[]) {
  const type = (attack.type === "melee" ? AttackTypeValue.MELEE : AttackTypeValue.RANGED) as AttackType;

  const mods = collectModifiers(withSelf(all, p), p.basicInfo.id, { damage: { kind: attack.type === "melee" ? "melee" : "ranged" } });

  const bonuses = mods.entries.filter((e) => e.percent || e.flat).map((e) => ({ label: e.label, percent: e.percent, flat: e.flat, icon: e.icon }));

  const avg = Math.round(getDiceAverage(attackDamageFormula(p, attack) || "1d6"));

  const estimate = calculateDamageWithModifiersImpl(p, avg, getAttackAbilityModifier(p.abilities, type), type, { allParticipants: all }).totalDamage;

  return { bonuses, estimate };
}

export function damageDiceSlots(p: BattleParticipant, attack: BattleAttack): number[] {
  const slots = getDiceSlots(attackDamageFormula(p, attack) || "1d6").filter((s) => Number.isFinite(s) && s >= 1);

  return slots.length ? slots : [6];
}
