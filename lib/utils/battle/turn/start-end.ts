import { applyDOTEffects, applyHOTEffects, armEffects, countDownAtTurnStart, countDownRoundEffects } from "./effects";
import { calculateInitiative, sortByInitiative } from "./initiative";
import { resetTurnState } from "./turn-state";

import { CombatStatus, DEFAULT_HAZARD_LABEL } from "@/lib/constants/battle";
import { applyBakedAuras } from "@/lib/utils/abilities/build/bake";
import { findParticipant, idleTurnIndex, isActive, replaceParticipant, sitsOutTurn } from "@/lib/utils/abilities/engine/core/participants";
import { resolveDowned, runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { dropBreakOnDamage } from "@/lib/utils/abilities/engine/effects/hp";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import { rollDyingAt } from "@/lib/utils/battle/death-saves";
import { hazardHit, hazardUnder } from "@/lib/utils/battle/grid/hazard";
import { landDive } from "@/lib/utils/battle/maneuvers";
import { actionsPerTurnPool, setExtraActionPool } from "@/lib/utils/battle/participant/helpers";
import { summonsOf } from "@/lib/utils/battle/participant/reserve";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

/**
 * Результат обробки початку ходу
 */
export interface StartOfTurnResult {
  participant: BattleParticipant;
  /** повний список: вміння turnStart і смерть від DOT можуть змінити інших */
  participants: BattleParticipant[];
  damageMessages: string[];
  expiredEffects: string[];
  abilityMessages: string[];
  rechargeMessages: string[];
  statusChanged: boolean; // чи змінився статус (unconscious/dead)
  hazard?: StartOfTurnHazard;
}

export interface StartOfTurnHazard {
  message: string;
  damage: number;
  hpBefore: number;
  label: string;
  damageType: string;
}

/**
 * Обробляє початок ходу учасника
 * @param participant - учасник бою
 * @param currentRound - поточний раунд
 * @param allParticipants - всі учасники бою (для контексту пасивок)
 * @param map - карта бою: небезпечна клітинка під учасником шкодить після DoT
 * @returns результат обробки
 */
export function processStartOfTurn(
  participant: BattleParticipant,
  currentRound: number,
  allParticipants: BattleParticipant[],
  rng: Rng = Math.random,
  map?: BattleMapConfig | null,
  rules?: Ruleset,
): StartOfTurnResult {
  let updatedParticipant = { ...participant };

  const rechargeMessages: string[] = [];

  for (const [key, pool] of Object.entries(participant.battleData.pools ?? {})) {
    const usage = participant.battleData.abilityUsage?.[key];

    const threshold = pool.recharge;

    if (!usage || usage.battle <= 0 || (threshold !== 4 && threshold !== 5 && threshold !== 6)) continue;

    const roll = Math.floor(rng() * 6) + 1;

    const recharged = roll >= threshold;

    if (recharged) {
      updatedParticipant = { ...updatedParticipant, battleData: { ...updatedParticipant.battleData, abilityUsage: { ...updatedParticipant.battleData.abilityUsage, [key]: { ...usage, battle: 0 } } } };
    }

    rechargeMessages.push(`🔄 ${pool.label} ${recharged ? "перезарядилась" : "не перезарядилась"} (${roll})`);
  }

  const hasNoBonusAction = hasEffectMarker(participant, "no_bonus_action");

  const hasNoReaction = hasEffectMarker(participant, "no_reaction");

  const skipChances = participant.battleData.activeEffects.flatMap((e) => e.effects.filter((d) => d.type === "skip_action").map((d) => ({ name: e.name, percent: d.value })));

  const damageMessages: string[] = [];

  let expiredEffects: string[] = [];

  const healMessages: string[] = [];

  let hazardResult: StartOfTurnHazard | undefined;

  let killedByRules = false;

  let others = allParticipants;

  // DoT/HoT — на початку ходу цілі; тривалості зменшуються наприкінці ходу (endTurnCleanup)
  if (
    updatedParticipant.combatStats.status !== CombatStatus.DEAD &&
    updatedParticipant.combatStats.status !== CombatStatus.UNCONSCIOUS &&
    !sitsOutTurn(updatedParticipant, currentRound)
  ) {
    const dotResult = applyDOTEffects(updatedParticipant, allParticipants);

    const beforeDot = updatedParticipant;

    const dotDamage = beforeDot.combatStats.currentHp - dotResult.newHp;

    const hurt = dropBreakOnDamage(
      {
        ...updatedParticipant,
        combatStats: {
          ...updatedParticipant.combatStats,
          currentHp: dotResult.newHp,
        },
      },
      dotDamage,
    );

    const dotRules = dotDamage > 0 ? applyDamageConsequences({ before: beforeDot, after: hurt, amount: dotDamage, rules, rng, participants: allParticipants }) : null;

    updatedParticipant = dotRules?.participant ?? hurt;
    others = dotRules?.participants ?? others;
    killedByRules = updatedParticipant.combatStats.status === CombatStatus.DEAD;
    damageMessages.push(...dotResult.damageMessages, ...(dotRules?.messages ?? []));

    const hazard = map && updatedParticipant.combatStats.currentHp > 0 ? hazardUnder(map, updatedParticipant, undefined, others) : null;

    const hit = hazard && hazardHit(updatedParticipant, hazard, currentRound, others, rng, rules);

    if (hit) {
      hazardResult = {
        message: hit.message,
        damage: hit.damage,
        hpBefore: updatedParticipant.combatStats.currentHp,
        label: hazard.label ?? DEFAULT_HAZARD_LABEL,
        damageType: hazard.damage?.type ?? "",
      };
      updatedParticipant = hit.participant;
      others = hit.participants;
      killedByRules = updatedParticipant.combatStats.status === CombatStatus.DEAD;
      damageMessages.push(...hit.consequences);
    }

    const hotResult = applyHOTEffects(updatedParticipant);

    updatedParticipant = { ...updatedParticipant, combatStats: { ...updatedParticipant.combatStats, currentHp: hotResult.newHp } };
    healMessages.push(...hotResult.healMessages);

    const { kept, expired } = countDownAtTurnStart(updatedParticipant.battleData.activeEffects);

    expiredEffects = expired;

    updatedParticipant = {
      ...updatedParticipant,
      battleData: {
        ...updatedParticipant.battleData,
        activeEffects: armEffects(kept),
      },
    };
  }

  // 1. Перевіряємо чи учасник впав в непритомність або помер (після DoT)
  let statusChanged = false;

  if (
    updatedParticipant.combatStats.currentHp <= 0 &&
    updatedParticipant.combatStats.status !== CombatStatus.DEAD
  ) {
    updatedParticipant = {
      ...updatedParticipant,
      combatStats: {
        ...updatedParticipant.combatStats,
        status:
          updatedParticipant.combatStats.currentHp < 0 ? CombatStatus.DEAD : CombatStatus.UNCONSCIOUS,
      },
    };
    statusChanged = true;
  } else if (killedByRules) {
    statusChanged = true;
  }

  const skippedBy = isActive(updatedParticipant) ? skipChances.find((s) => rng() * 100 < s.percent) : undefined;

  // 5. Скидаємо флаги дій; ефекти no_bonus_action / no_reaction блокують відповідні дії
  updatedParticipant = {
    ...updatedParticipant,
    actionFlags: {
      ...updatedParticipant.actionFlags,
      hasUsedAction: skippedBy !== undefined,
      hasUsedBonusAction: hasNoBonusAction,
      hasUsedReaction: hasNoReaction,
    },
    battleData: resetTurnState(updatedParticipant),
  };

  const id = participant.basicInfo.id;

  // додаткові дії, отримані поза своїм ходом, не переносяться — пул ходу це лише actionsPerTurn
  updatedParticipant = setExtraActionPool(updatedParticipant, isActive(updatedParticipant) ? actionsPerTurnPool(updatedParticipant, allParticipants) : 0);

  const ctx = { round: currentRound, rng, map, rules };

  let participants = allParticipants.some((p) => p.basicInfo.id === id)
    ? replaceParticipant(others, updatedParticipant)
    : [updatedParticipant];

  const abilityMessages: string[] = [...healMessages];

  if (updatedParticipant.battleData.airborne && updatedParticipant.battleData.airborne.since < currentRound) {
    const landed = landDive(participants, id, { map, rng, rules });

    participants = landed.participants;
    abilityMessages.push(...landed.messages);

    for (const d of landed.downed) {
      const r = resolveDowned(participants, d, ctx);

      participants = r.participants;
      abilityMessages.push(...r.messages);
    }
  }

  if (skippedBy) abilityMessages.push(`💫 ${participant.basicInfo.name} втрачає дію (${skippedBy.name})`);

  if (statusChanged) {
    const r = resolveDowned(participants, { victimId: id, actorId: null }, ctx);

    participants = r.participants;
    abilityMessages.push(...r.messages);
  } else if (isActive(updatedParticipant)) {
    const r = runAbilities(participants, { type: "turnStart", actorId: id }, ctx);

    participants = r.participants;
    abilityMessages.push(...r.messages);
  }

  return {
    participant: findParticipant(participants, id) ?? updatedParticipant,
    participants,
    damageMessages,
    expiredEffects,
    abilityMessages,
    rechargeMessages,
    statusChanged,
    ...(hazardResult && { hazard: hazardResult }),
  };
}

/**
 * Обробляє завершення ходу та перехід до наступного
 * @param currentTurnIndex - поточний індекс ходу
 * @param initiativeOrder - масив учасників
 * @param currentRound - поточний раунд
 * @returns новий індекс ходу та раунд
 */
export function processEndOfTurn(
  currentTurnIndex: number,
  initiativeOrder: BattleParticipant[],
  currentRound: number,
  deathSaves?: { rules?: Ruleset; rng?: () => number },
): { nextTurnIndex: number; nextRound: number; participants?: BattleParticipant[]; messages?: string[] } {
  let order = initiativeOrder;

  const messages: string[] = [];

  let nextTurnIndex = currentTurnIndex;

  let nextRound = currentRound;

  let attempts = 0;

  const maxAttempts = initiativeOrder.length;

  do {
    nextTurnIndex += 1;
    attempts += 1;

    if (nextTurnIndex >= initiativeOrder.length) {
      nextTurnIndex = 0;
      nextRound += 1;
    }

    // у новому раунді черга перевпорядковується: кидки для нього робить цикл ходу
    const rolled = nextRound === currentRound ? rollDyingAt(order, nextTurnIndex, deathSaves?.rules, deathSaves?.rng ?? Math.random) : null;

    if (rolled) {
      order = rolled.participants;
      messages.push(...rolled.messages);
    }

    const nextParticipant = order[nextTurnIndex];

    if (
      nextParticipant &&
      nextParticipant.combatStats.status !== CombatStatus.DEAD &&
      nextParticipant.combatStats.status !== CombatStatus.UNCONSCIOUS &&
      !sitsOutTurn(nextParticipant, nextRound)
    ) {
      break;
    }

    // Якщо ми перевірили всіх і нікого живого немає - зупиняємось (безпека)
    if (attempts >= maxAttempts) {
      // у лабіринті живі можуть не ходити (сплять, вийшли): новий раунд починається з першого живого
      if (initiativeOrder.some(isActive)) nextTurnIndex = idleTurnIndex(initiativeOrder);

      break;
    }
  } while (true);

  return {
    nextTurnIndex,
    nextRound,
    ...(messages.length > 0 && { participants: order, messages }),
  };
}

/**
 * Обробляє початок нового раунду
 * @param initiativeOrder - масив учасників
 * @param currentRound - поточний раунд
 * @param pendingSummons - масив призваних істот що з'являться
 * @returns оновлений масив учасників та повідомлення
 */
export function processStartOfRound(
  initiativeOrder: BattleParticipant[],
  currentRound: number,
  pendingSummons: BattleParticipant[] = [],
  rng: Rng = Math.random,
  map?: BattleMapConfig | null,
  rules?: Ruleset,
): {
  updatedInitiativeOrder: BattleParticipant[];
  message: string;
  triggerMessages: string[];
  lairMessages: string[];
} {
  // 0. Видаляємо тимчасові слоти додаткових ходів з попереднього раунду
  const baseOrder = (initiativeOrder || []).filter((p) => !p.basicInfo?.isExtraTurnSlot);

  const summons = summonsOf(pendingSummons);

  const updatedOrder = [...baseOrder, ...summons];

  const newSummonIds = new Set(summons.map((p) => p.basicInfo.id));

  const ctx = { round: currentRound, rng, map, rules };

  const messages: string[] = [];

  let order = updatedOrder;

  if (newSummonIds.size > 0) {
    order = applyBakedAuras(order, newSummonIds);

    const joined = runAbilities(order, { type: "battleStart", newcomerIds: [...newSummonIds] }, ctx);

    order = joined.participants;
    messages.push(...joined.messages);
  }

  const round = runAbilities(order, { type: "roundStart" }, ctx);

  messages.push(...round.messages);

  const sortedOrder = sortByInitiative(
    round.participants.map((p) => ({ ...p, abilities: { ...p.abilities, initiative: calculateInitiative(p, round.participants) } })),
  );

  return {
    updatedInitiativeOrder: sortedOrder.map(countDownRoundEffects),
    message: `🔁 Початок Раунду ${currentRound}`,
    triggerMessages: messages,
    lairMessages: sortedOrder.filter((p) => p.battleData.lair?.active && isActive(p) && p.battleData.resolvedAbilities.some((a) => a.limits?.lair)).map((p) => `🏰 Ініціатива 20: дія лігва — ${p.basicInfo.name}`),
  };
}
