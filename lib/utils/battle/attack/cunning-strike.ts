import type { AbilityKey } from "@/lib/constants/abilities";
import { findParticipant, isActive, resolvedAbilitiesOf } from "@/lib/utils/abilities/engine/core/participants";
import { withinLimits } from "@/lib/utils/abilities/engine/core/usage";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import type { CunningStrikeEffect } from "@/lib/utils/abilities/schema";
import { disengageEffect } from "@/lib/utils/battle/actions/effects";
import { type ActionFlow, getP, put } from "@/lib/utils/battle/common/action-flow";
import { applyCondition5e } from "@/lib/utils/battle/conditions/apply";
import { rollSave } from "@/lib/utils/battle/saves";
import { diceCount } from "@/lib/utils/common/dice";
import type { BattleParticipant } from "@/types/battle";

export const CUNNING_STRIKE_LABELS: Record<CunningStrikeEffect, string> = { poison: "Отрута", trip: "Підніжка", withdraw: "Відхід" };

const CONDITION_ROUNDS = 10;

export interface CunningStrikeOffer {
  options: { effect: CunningStrikeEffect; dice: number }[];
  maxEffects: number;
  sneakKey: string;
  sneakDice: number;
}

export function cunningStrikeOffer(attacker: BattleParticipant, round: number): CunningStrikeOffer | null {
  const abilities = resolvedAbilitiesOf(attacker);

  const sneak = abilities.find((a) => a.params?.sneakAttack);

  const params = abilities.flatMap((a) => a.params?.cunningStrike ?? []);

  if (!sneak || params.length === 0 || !withinLimits(attacker, sneak, round)) return null;

  const dealt = sneak.effects.find((e) => e.kind === "dealDamage");

  const sneakDice = dealt && typeof dealt.amount === "string" ? diceCount(dealt.amount) : 0;

  const options = params.flatMap((p) => p.options ?? []);

  if (sneakDice === 0 || options.length === 0) return null;

  return { options, maxEffects: Math.max(1, ...params.map((p) => p.maxEffects ?? 1)), sneakKey: sneak.key, sneakDice };
}

/** Повертає вартість у кубиках, або текст відмови. */
export function cunningStrikeCost(offer: CunningStrikeOffer | null, effects: CunningStrikeEffect[]): number | string {
  if (!offer) return "Підступний удар недоступний цього ходу";

  if (new Set(effects).size !== effects.length) return "Ефект Підступного удару не можна повторювати";

  if (effects.length > offer.maxEffects) return `Підступний удар: не більше ${offer.maxEffects} ефектів`;

  let cost = 0;

  for (const effect of effects) {
    const option = offer.options.find((o) => o.effect === effect);

    if (!option) return `Підступний удар: ефект «${CUNNING_STRIKE_LABELS[effect]}» не відкритий`;

    cost += option.dice;
  }

  return cost > offer.sneakDice ? "Підступний удар: недостатньо кубиків Прихованої атаки" : cost;
}

export function toggleCunningStrike(selected: CunningStrikeEffect[], effect: CunningStrikeEffect, offer: CunningStrikeOffer): CunningStrikeEffect[] {
  if (selected.includes(effect)) return selected.filter((e) => e !== effect);

  const next = offer.maxEffects === 1 ? [effect] : [...selected, effect];

  return typeof cunningStrikeCost(offer, next) === "number" ? next : selected;
}

const SAVE_ABILITY: Record<"poison" | "trip", AbilityKey> = { poison: "constitution", trip: "dexterity" };

export const cunningStrikeDc = (attacker: BattleParticipant): number => 8 + attacker.abilities.modifiers.dexterity + attacker.abilities.proficiencyBonus;

export function applyCunningStrikeEffects(flow: ActionFlow, attackerId: string, targetId: string, effects: CunningStrikeEffect[]): void {
  for (const effect of effects) {
    const attacker = getP(flow, attackerId);

    if (effect === "withdraw") {
      put(flow, upsertTimedEffect(attacker, disengageEffect(attackerId), flow.ctx.round));
      flow.messages.push(`🏃 Підступний удар (${CUNNING_STRIKE_LABELS.withdraw}): ${attacker.basicInfo.name} відходить без атак можливості`);
      continue;
    }

    const target = findParticipant(flow.ps, targetId);

    if (!target || !isActive(target)) continue;

    const ability = SAVE_ABILITY[effect];

    const dc = cunningStrikeDc(attacker);

    const save = rollSave({ target, ability, dc, participants: flow.ps, rules: flow.ctx.rules, rng: flow.ctx.rng });

    const label = `Підступний удар (${CUNNING_STRIKE_LABELS[effect]})`;

    if (save.success) {
      flow.messages.push(`🛡 ${label}: ${target.basicInfo.name} витримує СК ${dc} (${save.total})`);
      continue;
    }

    flow.messages.push(`🎲 ${label}: ${target.basicInfo.name} провалює СК ${dc} (${save.total})`);

    const r = applyCondition5e(flow.ps, targetId, {
      key: effect === "poison" ? "poisoned" : "prone",
      rounds: CONDITION_ROUNDS,
      permanent: effect === "trip",
      ...(effect === "poison" && { saveEnds: { ability, dc } }),
      source: { participantId: attackerId, name: attacker.basicInfo.name, abilityName: label },
      sourceName: label,
      timedKey: `cunning:${effect}@${attackerId}`,
      round: flow.ctx.round,
      rules: flow.ctx.rules,
    });

    flow.ps = r.participants;
    flow.messages.push(...r.messages);
  }
}
