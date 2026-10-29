import { applyDOTEffects, applyHOTEffects, armEffects, countDownAtTurnStart } from "./effects";
import { resetTurnState } from "./turn-state";

import { CombatStatus, DEFAULT_HAZARD_LABEL, EffectMarker,isRecharge } from "@/lib/constants/battle";
import { findParticipant, isActive, replaceParticipant, sitsOutTurn } from "@/lib/utils/abilities/engine/core/participants";
import { resolveDowned, runAbilities } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { dropBreakOnDamage } from "@/lib/utils/abilities/engine/effects/hp";
import { applyDamageConsequences } from "@/lib/utils/battle/damage/consequences";
import { hazardHit, hazardUnder } from "@/lib/utils/battle/grid/hazard";
import { landDive } from "@/lib/utils/battle/maneuvers";
import { actionsPerTurnPool, setExtraActionPool } from "@/lib/utils/battle/participant/helpers";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import { hasAnchors } from "@/lib/utils/battle/spell/anchored-zone";
import { pruneDeadInlineGrants } from "@/lib/utils/battle/spell/inline-grant";
import { resolvePendingHits } from "@/lib/utils/battle/spell/pending-hits";
import { zoneTurnStart } from "@/lib/utils/battle/spell/zone-triggers";
import { rollDie } from "@/lib/utils/common/dice";
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

function rechargePools(participant: BattleParticipant, rng: Rng): { participant: BattleParticipant; messages: string[] } {
  let updated = participant;

  const messages: string[] = [];

  for (const [key, pool] of Object.entries(participant.battleData.pools ?? {})) {
    const usage = participant.battleData.abilityUsage?.[key];

    const threshold = pool.recharge;

    if (!usage || usage.battle <= 0 || !isRecharge(threshold)) continue;

    const roll = rollDie(6, rng);

    const recharged = roll >= threshold;

    if (recharged) {
      updated = { ...updated, battleData: { ...updated.battleData, abilityUsage: { ...updated.battleData.abilityUsage, [key]: { ...usage, battle: 0 } } } };
    }

    messages.push(`🔄 ${pool.label} ${recharged ? "перезарядилась" : "не перезарядилась"} (${roll})`);
  }

  return { participant: updated, messages };
}

interface StartOfTurnDamage {
  participant: BattleParticipant;
  others: BattleParticipant[];
  damageMessages: string[];
  healMessages: string[];
  expiredEffects: string[];
  hazard?: StartOfTurnHazard;
  killedByRules: boolean;
}

// DoT/HoT — на початку ходу цілі; тривалості зменшуються наприкінці ходу (endTurnCleanup)
function applyStartOfTurnDamage(
  participant: BattleParticipant,
  allParticipants: BattleParticipant[],
  currentRound: number,
  rng: Rng,
  map: BattleMapConfig | null | undefined,
  rules: Ruleset | undefined,
): StartOfTurnDamage {
  let updatedParticipant = participant;

  let others = allParticipants;

  const damageMessages: string[] = [];

  const healMessages: string[] = [];

  let expiredEffects: string[] = [];

  let hazardResult: StartOfTurnHazard | undefined;

  let killedByRules = false;

  if (updatedParticipant.battleData.pendingHits?.length) {
    const hits = resolvePendingHits(replaceParticipant(allParticipants, updatedParticipant), updatedParticipant.basicInfo.id, { round: currentRound, rng, rules });

    others = hits.participants;
    updatedParticipant = findParticipant(others, updatedParticipant.basicInfo.id) ?? updatedParticipant;
    damageMessages.push(...hits.messages);
  }

  if (
    updatedParticipant.combatStats.status !== CombatStatus.DEAD &&
    updatedParticipant.combatStats.status !== CombatStatus.UNCONSCIOUS &&
    !sitsOutTurn(updatedParticipant, currentRound)
  ) {
    const dotResult = applyDOTEffects(updatedParticipant, others, rng);

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

    const dotRules = dotDamage > 0 ? applyDamageConsequences({ before: beforeDot, after: hurt, amount: dotDamage, rules, rng, participants: others }) : null;

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

    if (map && (map.spellZones || hasAnchors([...others, updatedParticipant])) && updatedParticipant.combatStats.currentHp > 0) {
      const zones = zoneTurnStart(map, replaceParticipant(others, updatedParticipant), updatedParticipant.basicInfo.id, { round: currentRound, rng, rules });

      others = zones.participants;
      updatedParticipant = findParticipant(others, updatedParticipant.basicInfo.id) ?? updatedParticipant;
      killedByRules = updatedParticipant.combatStats.status === CombatStatus.DEAD;
      damageMessages.push(...zones.messages);
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

  return { participant: updatedParticipant, others, damageMessages, healMessages, expiredEffects, hazard: hazardResult, killedByRules };
}

// Скидаємо флаги дій; ефекти no_bonus_action / no_reaction блокують відповідні дії
function resetTurnFlags(updated: BattleParticipant, original: BattleParticipant, allParticipants: BattleParticipant[], rng: Rng): { participant: BattleParticipant; skippedBy: { name: string; percent: number } | undefined } {
  const skipChances = original.battleData.activeEffects.flatMap((e) => e.effects.filter((d) => d.type === EffectMarker.SKIP_ACTION).map((d) => ({ name: e.name, percent: d.value })));

  const skippedBy = isActive(updated) ? skipChances.find((s) => rng() * 100 < s.percent) : undefined;

  const flagged = {
    ...updated,
    actionFlags: {
      ...updated.actionFlags,
      hasUsedAction: skippedBy !== undefined,
      hasUsedBonusAction: hasEffectMarker(original, EffectMarker.NO_BONUS_ACTION),
      hasUsedReaction: hasEffectMarker(original, EffectMarker.NO_REACTION),
    },
    battleData: resetTurnState(updated),
  };

  // додаткові дії, отримані поза своїм ходом, не переносяться — пул ходу це лише actionsPerTurn
  return { participant: setExtraActionPool(flagged, isActive(flagged) ? actionsPerTurnPool(flagged, allParticipants) : 0), skippedBy };
}

/** `map`: a hazard cell under the participant damages after DoT. */
export function processStartOfTurn(
  participant: BattleParticipant,
  currentRound: number,
  allParticipants: BattleParticipant[],
  rng: Rng = Math.random,
  map?: BattleMapConfig | null,
  rules?: Ruleset,
): StartOfTurnResult {
  const recharged = rechargePools({ ...participant }, rng);

  const rechargeMessages = recharged.messages;

  const damage = applyStartOfTurnDamage(recharged.participant, allParticipants, currentRound, rng, map, rules);

  const { others, damageMessages, healMessages, expiredEffects, killedByRules } = damage;

  let updatedParticipant = damage.participant;

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

  const reset = resetTurnFlags(updatedParticipant, participant, allParticipants, rng);

  const { skippedBy } = reset;

  updatedParticipant = pruneDeadInlineGrants(reset.participant, currentRound, allParticipants);

  const id = participant.basicInfo.id;

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
    ...(damage.hazard && { hazard: damage.hazard }),
  };
}
