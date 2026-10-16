import { applyResistance } from "@/lib/utils/battle/resistance";
import { ActiveEffect, BattleParticipant } from "@/types/battle";

export function applyDOTEffects(
  participant: BattleParticipant,
  participants: BattleParticipant[] = [participant],
): { newHp: number; damageMessages: string[] } {
  let currentHp = participant.combatStats.currentHp;

  const damageMessages: string[] = [];

  for (const effect of participant.battleData.activeEffects) {
    if (effect.dotDamage) {
      const { damagePerRound, damageType, fromSpell } = effect.dotDamage;

      const { finalDamage } = applyResistance(participant, damagePerRound, damageType, { participants, fromSpell });

      currentHp = Math.max(0, currentHp - finalDamage);
      damageMessages.push(
        finalDamage === damagePerRound
          ? `${participant.basicInfo.name}: ${finalDamage} ${damageType} шкоди від ${effect.name}`
          : `${participant.basicInfo.name}: ${finalDamage} (з ${damagePerRound}) ${damageType} шкоди від ${effect.name}`,
      );
    }
  }

  return {
    newHp: currentHp,
    damageMessages,
  };
}

export function applyHOTEffects(participant: BattleParticipant): { newHp: number; healMessages: string[] } {
  let currentHp = participant.combatStats.currentHp;

  const healMessages: string[] = [];

  if (currentHp <= 0) return { newHp: currentHp, healMessages };

  for (const effect of participant.battleData.activeEffects) {
    if (!effect.hotHeal) continue;

    const healed = Math.min(participant.combatStats.maxHp, currentHp + effect.hotHeal.healPerRound);

    if (healed > currentHp) healMessages.push(`${participant.basicInfo.name}: +${healed - currentHp} HP від ${effect.name}`);

    currentHp = healed;
  }

  return { newHp: currentHp, healMessages };
}

/** Позначає ефекти, що вже є на учаснику на початку його ходу: саме їм цей хід зараховується. */
// ініціатива впливає лише на чергу: «N раундів» = N наступних сортувань на початку раунду
export const isInitiativeOnly = (e: ActiveEffect) =>
  !!e.abilityEffects?.length && e.effects.length === 0 && e.abilityEffects.every((s) => s.kind === "modifyStat" && s.stat === "initiative");

export function armEffects(effects: ActiveEffect[]): ActiveEffect[] {
  return effects.map((e) => (e.armed || e.permanent || e.countdownAtTurnStart || isInitiativeOnly(e) ? e : { ...e, armed: true }));
}

/** Після сортування черги на початку раунду: відлік для ефектів ініціативи. */
export function countDownInitiativeEffects(p: BattleParticipant): BattleParticipant {
  if (!p.battleData.activeEffects.some(isInitiativeOnly)) return p;

  const activeEffects = p.battleData.activeEffects.flatMap((e) => (!isInitiativeOnly(e) ? [e] : e.duration <= 1 ? [] : [{ ...e, duration: e.duration - 1 }]));

  return { ...p, battleData: { ...p.battleData, activeEffects } };
}

/** Початок ходу власника: відлік для countdownAtTurnStart. */
export function countDownAtTurnStart(effects: ActiveEffect[]): { kept: ActiveEffect[]; expired: string[] } {
  const kept: ActiveEffect[] = [];

  const expired: string[] = [];

  for (const e of effects) {
    if (!e.countdownAtTurnStart) kept.push(e);
    else if (e.duration <= 1) expired.push(e.name);
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
  expiredEffects: string[];
} {
  const updatedEffects: ActiveEffect[] = [];

  const expiredEffects: string[] = [];

  for (const effect of participant.battleData.activeEffects) {
    if (!effect.armed) {
      updatedEffects.push(effect);
      continue;
    }

    const newDuration = effect.duration - 1;

    if (newDuration <= 0 || effect.expireAtTurnEnd) {
      expiredEffects.push(effect.name);
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
