import { ParticipantSide } from "@/lib/constants/battle";
import { collectModifiers } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { withSelf } from "@/lib/utils/abilities/engine/core/participants";
import { cooldownLeft, withinCountLimits } from "@/lib/utils/abilities/engine/core/usage";
import { deadTargetRules, isEligibleDeadTarget } from "@/lib/utils/abilities/target-rules";
import { calculateAttackBonus } from "@/lib/utils/battle/attack/bonus";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
import { isUp } from "@/lib/utils/battle/participant/state";
import { spellNeedsSlot, spellSlotLeft } from "@/lib/utils/battle/spell/slot";
import { diceSlots } from "@/lib/utils/common/dice";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAction, BattleAttack, BattleParticipant } from "@/types/battle";

export type SpellTier = "iron" | "bronze" | "silver" | "gold" | "mithril" | "platinum";

const TIERS: SpellTier[] = ["iron", "bronze", "silver", "gold", "mithril", "platinum"];

export function spellTier(level: number): SpellTier {
  return TIERS[Math.max(0, Math.min(5, level))];
}

export function slotLevels(p: BattleParticipant): { level: 1 | 2 | 3 | 4 | 5; max: number; current: number }[] {
  return ([1, 2, 3, 4, 5] as const).map((level) => {
    const s = p.spellcasting?.spellSlots?.[String(level)];

    return { level, max: s?.max ?? 0, current: s?.current ?? 0 };
  });
}

/** Чи лишилося заклинання за бонусну дію з вільним слотом (слоти — як у castSpell). */
export function canCastBonusSpell(p: BattleParticipant, spells: { level: number; cost?: string | null }[]): boolean {
  if (p.actionFlags.hasUsedBonusAction) return false;

  return spells.some((s) => s.cost === "bonusAction" && (!spellNeedsSlot(s.level) || spellSlotLeft(p, s.level) > 0));
}

export interface AbilityCharge {
  key: string;
  name: string;
  icon?: string | null;
  left: number;
  limit: number | null;
  per: "battle" | "round" | "turn" | null;
  cooldownLeft: number;
}

export function abilityCharges(p: BattleParticipant, round: number, triggers: readonly string[] = ["bonusAction", "action"]): AbilityCharge[] {
  return (p.battleData.resolvedAbilities ?? []).flatMap((a): AbilityCharge[] => {
    if (!triggers.includes(a.trigger.event) || !a.limits) return [];

    const per = a.limits.perBattle ? "battle" : a.limits.perRound ? "round" : a.limits.perTurn ? "turn" : null;

    const cooldown = cooldownLeft(p, a, round);

    if (!per && !a.limits.cooldownRounds) return [];

    const base = { key: a.key, name: a.name, icon: a.source.icon ?? undefined, cooldownLeft: cooldown };

    if (!per) return [{ ...base, left: cooldown > 0 ? 0 : 1, limit: null, per: null }];

    const limit = (per === "battle" ? a.limits.perBattle : per === "round" ? a.limits.perRound : a.limits.perTurn) as number;

    const used = p.battleData.abilityUsage?.[a.key]?.[per] ?? 0;

    return [{ ...base, left: Math.max(0, limit - used), limit, per }];
  });
}

const HOSTILE = new Set(["dealDamage", "dot", "applyCondition"]);

// flags read from the holder's side: these help whoever attacks the holder
const HOSTILE_FLAGS = new Set(["advantageForAttackers", "disadvantage"]);

export function bonusTargetSide(a: ResolvedAbility): ParticipantSide | null {
  if (a.effects.some((e) => e.kind === "maneuver")) return ParticipantSide.ENEMY;

  const aimed = a.effects.filter((e) => "target" in e && e.target === "eventTarget");

  if (aimed.length === 0) return null;

  const hostile = aimed.some((e) =>
    HOSTILE.has(e.kind) ||
    (e.kind === "flag" && HOSTILE_FLAGS.has(e.flag)) ||
    (("flat" in e && typeof e.flat === "number" && e.flat < 0) || ("percent" in e && typeof e.percent === "number" && e.percent < 0)),
  );

  return hostile ? ParticipantSide.ENEMY : ParticipantSide.ALLY;
}

export interface AbilityOption {
  ability: ResolvedAbility;
  cooldownLeft: number;
}

export function abilityOptions(p: BattleParticipant, trigger: "bonusAction" | "action", round: number): AbilityOption[] {
  return (p.battleData.resolvedAbilities ?? [])
    .filter((a) => a.trigger.event === trigger && withinCountLimits(p, a))
    .map((ability) => ({ ability, cooldownLeft: cooldownLeft(p, ability, round) }));
}

export function usableAbilities(p: BattleParticipant, trigger: "bonusAction" | "action", round: number): ResolvedAbility[] {
  return abilityOptions(p, trigger, round).filter((o) => o.cooldownLeft === 0).map((o) => o.ability);
}

/** Маневри на карті цілять клітинкою або власним оточенням, тож ціль-учасник потрібна лише без карти. */
export function needsBonusTarget(a: ResolvedAbility, onMap = false): boolean {
  if (onMap && a.effects.some((e) => e.kind === "maneuver")) return false;

  return bonusTargetSide(a) !== null || deadTargetRules(a).requiresDead;
}

export function bonusTargetCandidates(a: ResolvedAbility, allies: BattleParticipant[], enemies: BattleParticipant[], owner?: BattleParticipant): BattleParticipant[] {
  const rules = deadTargetRules(a);

  if (rules.requiresDead) return [...allies, ...enemies].filter((p) => isEligibleDeadTarget(rules, p, owner));

  const selfId = owner?.basicInfo.id;

  const pool = (bonusTargetSide(a) === ParticipantSide.ENEMY ? enemies : allies).filter((p) => isUp(p) && !p.battleData.airborne);

  return a.effects.some((e) => e.kind === "guard") ? pool.filter((p) => p.basicInfo.id !== selfId) : pool;
}

export function lastAction(log: BattleAction[]): BattleAction | null {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    if (log[i].actionType !== "end_turn") return log[i];
  }

  return null;
}

export function needsMoraleCheck(p: BattleParticipant, participants: BattleParticipant[], pendingMoraleCheck: unknown): boolean {
  if (p.battleData.extraTurnActive || (pendingMoraleCheck as { participantId?: string } | null)?.participantId === p.basicInfo.id) return false;

  return effectiveMorale(p, participants).value !== 0;
}

export function weaponPreview(p: BattleParticipant, attack: BattleAttack, all: BattleParticipant[]) {
  const mods = collectModifiers(withSelf(all, p), p.basicInfo.id, { damage: { kind: attackKindOf(attack.type) } });

  const bonuses = mods.entries.filter((e) => e.percent || e.flat).map((e) => ({ label: e.label, percent: e.percent, flat: e.flat, icon: e.icon }));

  const estimate = averageAttackDamage(p, attack, all).total;

  return { bonuses, estimate, toHit: calculateAttackBonus(p, attack, all), formula: heroAttackDamageParts(p, attack).formula };
}

export function damageDiceSlots(p: BattleParticipant, attack: BattleAttack): number[] {
  const slots = diceSlots(heroAttackDamageParts(p, attack).formula);

  return slots.length ? slots : [6];
}
