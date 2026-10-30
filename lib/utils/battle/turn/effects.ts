import { textRef } from "@/lib/i18n/text-ref";
import { effectName } from "@/lib/utils/battle/common/terms";
import { applyResistance } from "@/lib/utils/battle/resistance";
import { rollDice } from "@/lib/utils/common/dice";
import { ActiveEffect, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function applyDOTEffects(
  participant: BattleParticipant,
  participants: BattleParticipant[] = [participant],
  rng: () => number = Math.random,
): { newHp: number; damageMessages: LogLine[] } {
  let currentHp = participant.combatStats.currentHp;

  const damageMessages: LogLine[] = [];

  for (const effect of participant.battleData.activeEffects) {
    if (effect.dotDamage) {
      const { dice, damageType, fromSpell } = effect.dotDamage;

      const damagePerRound = dice ? rollDice(dice, rng) : effect.dotDamage.damagePerRound;

      const { finalDamage } = applyResistance(participant, damagePerRound, damageType, { participants, fromSpell });

      currentHp = Math.max(0, currentHp - finalDamage);
      damageMessages.push(
        finalDamage === damagePerRound
          ? textRef("battleLog.turn.dot", { name: participant.basicInfo.name, damage: finalDamage, type: damageType, effect: effectName(effect) })
          : textRef("battleLog.turn.dotReduced", { name: participant.basicInfo.name, damage: finalDamage, base: damagePerRound, type: damageType, effect: effectName(effect) }),
      );
    }
  }

  return {
    newHp: currentHp,
    damageMessages,
  };
}

export function applyHOTEffects(participant: BattleParticipant): { newHp: number; healMessages: LogLine[] } {
  let currentHp = participant.combatStats.currentHp;

  const healMessages: LogLine[] = [];

  if (currentHp <= 0) return { newHp: currentHp, healMessages };

  for (const effect of participant.battleData.activeEffects) {
    if (!effect.hotHeal) continue;

    const healed = Math.min(participant.combatStats.maxHp, currentHp + effect.hotHeal.healPerRound);

    if (healed > currentHp) healMessages.push(textRef("battleLog.turn.hot", { name: participant.basicInfo.name, heal: healed - currentHp, effect: effectName(effect) }));

    currentHp = healed;
  }

  return { newHp: currentHp, healMessages };
}

// ініціатива/швидкість (Поспіх, Сповільнення): «N раундів» = N наступних сортувань черги на початку раунду
const isRoundCounted = (e: ActiveEffect) =>
  !!e.abilityEffects?.length && e.effects.length === 0 && e.abilityEffects.every((s) => s.kind === "modifyStat" && (s.stat === "initiative" || s.stat === "speed"));

/** Позначає ефекти, що вже є на учаснику на початку його ходу: саме їм цей хід зараховується. */
export function armEffects(effects: ActiveEffect[]): ActiveEffect[] {
  return effects.map((e) => (e.armed || e.permanent || e.countdownAtTurnStart || isRoundCounted(e) ? e : { ...e, armed: true }));
}

/** Після сортування черги на початку раунду: відлік для ефектів ініціативи й швидкості. */
export function countDownRoundEffects(p: BattleParticipant): BattleParticipant {
  if (!p.battleData.activeEffects.some(isRoundCounted)) return p;

  const activeEffects = p.battleData.activeEffects.flatMap((e) => (!isRoundCounted(e) ? [e] : e.duration <= 1 ? [] : [{ ...e, duration: e.duration - 1 }]));

  return { ...p, battleData: { ...p.battleData, activeEffects } };
}

/** Початок ходу власника: відлік для countdownAtTurnStart. */
export function countDownAtTurnStart(effects: ActiveEffect[]): { kept: ActiveEffect[]; expired: LogLine[] } {
  const kept: ActiveEffect[] = [];

  const expired: LogLine[] = [];

  for (const e of effects) {
    if (!e.countdownAtTurnStart) kept.push(e);
    else if (e.duration <= 1) expired.push(effectName(e));
    else kept.push({ ...e, duration: e.duration - 1 });
  }

  return { kept, expired };
}

/**
 * Кінець ходу власника: «N раундів» = N його ходів. Накладені під час цього ходу ефекти (не armed)
 * не втрачають тривалість, expireAtTurnEnd знімається після першого повного ходу.
 */
export function decreaseEffectDurations(
  participant: BattleParticipant
): {
  updatedEffects: ActiveEffect[];
  expiredEffects: LogLine[];
} {
  const updatedEffects: ActiveEffect[] = [];

  const expiredEffects: LogLine[] = [];

  for (const effect of participant.battleData.activeEffects) {
    if (!effect.armed) {
      updatedEffects.push(effect);
      continue;
    }

    const newDuration = effect.duration - 1;

    if (newDuration <= 0 || effect.expireAtTurnEnd) {
      expiredEffects.push(effectName(effect));
    } else {
      const { armed: _armed, ...rest } = effect;

      updatedEffects.push({ ...rest, duration: newDuration });
    }
  }

  return {
    updatedEffects,
    expiredEffects,
  };
}

/**
 * Додає новий активний ефект до учасника
 * @param participant - учасник бою
 * @param effect - новий ефект для застосування
 * @param currentRound - поточний раунд
 * @returns оновлені активні ефекти
 */
export function addActiveEffect(
  participant: BattleParticipant,
  effect: Omit<ActiveEffect, "appliedAt">,
  currentRound: number
): ActiveEffect[] {
  const newEffect: ActiveEffect = {
    ...effect,
    appliedAt: {
      round: currentRound,
      timestamp: new Date(),
    },
  };

  return [...participant.battleData.activeEffects, newEffect];
}
