import { ParticipantSide } from "@/lib/constants/battle";
import { collectModifiers } from "@/lib/utils/abilities/engine/collect-modifiers";
import { isActive, withSelf } from "@/lib/utils/abilities/engine/participants";
import { conditionRequiresDeadTarget } from "@/lib/utils/abilities/registry/conditions";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { averageAttackDamage } from "@/lib/utils/battle/damage/average";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { effectiveMorale } from "@/lib/utils/battle/morale/effective-morale";
import { isUp } from "@/lib/utils/battle/participant/state";
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

const HOSTILE = new Set(["dealDamage", "dot", "applyCondition"]);

export function bonusTargetSide(a: ResolvedAbility): ParticipantSide | null {
  const aimed = a.effects.filter((e) => "target" in e && e.target === "eventTarget");

  if (aimed.length === 0) return null;

  const hostile = aimed.some((e) =>
    HOSTILE.has(e.kind) || (("flat" in e && typeof e.flat === "number" && e.flat < 0) || ("percent" in e && typeof e.percent === "number" && e.percent < 0)),
  );

  return hostile ? ParticipantSide.ENEMY : ParticipantSide.ALLY;
}

export function needsBonusTarget(a: ResolvedAbility): boolean {
  return bonusTargetSide(a) !== null || conditionRequiresDeadTarget(a.condition);
}

export function bonusTargetCandidates(a: ResolvedAbility, allies: BattleParticipant[], enemies: BattleParticipant[]): BattleParticipant[] {
  if (conditionRequiresDeadTarget(a.condition)) return [...allies, ...enemies].filter((p) => !isActive(p));

  return (bonusTargetSide(a) === ParticipantSide.ENEMY ? enemies : allies).filter(isUp);
}

export function lastAction(log: BattleAction[]): BattleAction | null {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    if (log[i].actionType !== "end_turn") return log[i];
  }

  return null;
}

export function needsMoraleCheck(p: BattleParticipant, participants: BattleParticipant[], pendingMoraleCheck: unknown): boolean {
  if ((pendingMoraleCheck as { participantId?: string } | null)?.participantId === p.basicInfo.id) return false;

  return effectiveMorale(p, participants).value !== 0;
}

export function weaponPreview(p: BattleParticipant, attack: BattleAttack, all: BattleParticipant[]) {
  const mods = collectModifiers(withSelf(all, p), p.basicInfo.id, { damage: { kind: attackKindOf(attack.type) } });

  const bonuses = mods.entries.filter((e) => e.percent || e.flat).map((e) => ({ label: e.label, percent: e.percent, flat: e.flat, icon: e.icon }));

  const estimate = averageAttackDamage(p, attack, all).total;

  return { bonuses, estimate };
}

export function damageDiceSlots(p: BattleParticipant, attack: BattleAttack): number[] {
  const slots = diceSlots(heroAttackDamageParts(p, attack).formula);

  return slots.length ? slots : [6];
}
