import { holdBackNewEffects, restoreHeldBack } from "./hold-back";
import { type AttackRequest, validateAttackRequest } from "./request";
import { damageDiceCursor, damageFractions, strikeD20 } from "./strike-rolls";
import { resolveAttackTargets } from "./targets";

import { AttackType } from "@/lib/constants/battle";
import { findFlagsMany } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, isActive, mergeParticipants, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng, SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import { processAttack } from "@/lib/utils/battle/attack";
import { activeEffectIds } from "@/lib/utils/battle/attack/consume-effects";
import { nextChainTarget } from "@/lib/utils/battle/attack/process/chain";
import { resolveRetaliation } from "@/lib/utils/battle/attack/retaliation";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { lineOfFire } from "@/lib/utils/battle/grid";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import { rollDie } from "@/lib/utils/common/dice";
import type { ActiveEffect, BattleAction, BattleMapConfig, BattleParticipant } from "@/types/battle";

export type AttackPhaseInput = {
  battle: {
    initiativeOrder: BattleParticipant[];
    currentRound: number;
    currentTurnIndex: number;
  };
  data: AttackRequest;
  battleId: string;
  userId: string;
  isDM: boolean;
  rng?: Rng;
  map?: BattleMapConfig | null;
  hitSpells?: ReadonlyMap<string, CastableSpell>;
};

export type AttackPhaseResult = {
  finalInitiativeOrder: BattleParticipant[];
  allBattleActions: BattleAction[];
  summons: SummonRequest[];
};

// Фаза атаки: валідація, processAttack на ціль, відповідний удар по основній цілі.
export function runAttackPhase(input: AttackPhaseInput): AttackPhaseResult {
  const { battle, data, battleId, userId, isDM } = input;

  const rng = input.rng ?? Math.random;

  const initiativeOrder = battle.initiativeOrder;

  const request = validateAttackRequest({ participants: initiativeOrder, scene: { turnIndex: battle.currentTurnIndex }, userId, isDM }, data);

  const { attacker, attack, chosenTargets, targetIds } = request;

  const flags = findFlagsMany(withSelf(initiativeOrder, attacker), attacker.basicInfo.id, ["attackHitsAllEnemies", "piercingShot", "multiTargetFalloff", "chainShot"]);

  const { targets, expanded, piercing, volley, falloff, serverRolledFrom, chain, chainPercent, chainJumps } = resolveAttackTargets({ order: initiativeOrder, attacker, attack, chosen: chosenTargets, targetIds, map: input.map, flags });

  const fractions = damageFractions(targets, attack, { volley, falloff });

  let currentAttacker = { ...attacker };

  let currentInitiativeOrder: BattleParticipant[] = initiativeOrder;

  const allBattleActions: BattleAction[] = [];

  const summons: SummonRequest[] = [];

  const damageFormula = (volley && (targets.length > 1 || expanded)) || chain ? heroAttackDamageParts(attacker, attack).formula : null;

  const dice = damageDiceCursor(data.damageRolls, damageFormula, rng);

  const effectsBeforeVolley = activeEffectIds([attacker]);

  const heldBack: ActiveEffect[] = [];

  const isRanged = attackKindOf(attack.type) === AttackType.RANGED;

  const strikeAt = (target: BattleParticipant, i: number, opts: { serverD20: boolean; multiplier?: number; cover: boolean; hop?: boolean }) => {
    const chosenAt = expanded ? chosenTargets.findIndex((t) => t.basicInfo.id === target.basicInfo.id) : i;

    const strike = opts.serverD20 ? { value: rollDie(20, rng), serverRolled: true } : strikeD20(data, request, { index: i, chosenAt, expanded }, rng);

    const strikeDice = dice.next();

    const second = opts.hop ? undefined : (data.secondRolls?.[chosenAt] ?? data.advantageRoll ?? data.disadvantageRoll);

    const victim = findParticipant(currentInitiativeOrder, target.basicInfo.id) ?? target;

    const obstacle = opts.cover && lineOfFire(input.map, currentInitiativeOrder, currentAttacker, victim).blocked;

    const attackResult = processAttack({
      attacker: currentAttacker,
      target: victim,
      attack,
      d20Roll: strike.value,
      advantageRoll: second,
      disadvantageRoll: second,
      rollMode: data.rollMode,
      actionSpent: i > 0,
      damageRolls: strikeDice.rolls,
      allParticipants: currentInitiativeOrder,
      currentRound: battle.currentRound,
      battleId,
      damageMultiplier: opts.multiplier,
      obstacle,
      map: input.map,
      hitSpells: input.hitSpells,
      rng,
      recordDice: true,
      serverRolled: { d20: strike.serverRolled, ...(strikeDice.serverRolled && { damageFrom: strikeDice.rolls.length - strikeDice.serverRolled.length }) },
    });

    if (attackResult.success) dice.hit();

    currentInitiativeOrder = mergeParticipants(currentInitiativeOrder, attackResult.allParticipantsUpdated ?? []);
    currentAttacker = attackResult.attackerUpdated;
    summons.push(...attackResult.summons);

    if (strikeDice.serverRolled && attackResult.success) {
      attackResult.battleAction.resultText = `${attackResult.battleAction.resultText} | 🎲 кубики шкоди кинув сервер: ${strikeDice.serverRolled.join(", ")}`;
    }

    allBattleActions.push(attackResult.battleAction);

    const provoked = attackResult.criticalEffectApplied?.effect.type === "provoke_opportunity_attack";

    if (i === 0 || provoked) {
      const retaliation = resolveRetaliation({
        participants: currentInitiativeOrder,
        attackerId: attacker.basicInfo.id,
        defenderId: target.basicInfo.id,
        attack,
        attackRoll: attackResult.attackRoll,
        criticalEffect: attackResult.criticalEffectApplied,
        provoked,
        round: battle.currentRound,
        battleId,
        rng,
        map: input.map,
      });

      if (retaliation) {
        currentInitiativeOrder = mergeParticipants(currentInitiativeOrder, retaliation.participants);
        currentAttacker = findParticipant(retaliation.participants, attacker.basicInfo.id) ?? currentAttacker;
        allBattleActions.push(retaliation.battleAction);
      }
    }

    const held = holdBackNewEffects(currentInitiativeOrder, currentAttacker, effectsBeforeVolley);

    currentInitiativeOrder = held.order;
    currentAttacker = held.attacker;
    heldBack.push(...held.held);

    return attackResult;
  };

  for (let i = 0; i < targets.length; i++) {
    // пробивний летить крізь цілі: штраф лише на першу
    strikeAt(targets[i], i, { serverD20: i >= serverRolledFrom, multiplier: targets.length > 1 ? fractions[i] : undefined, cover: isRanged && !(piercing && i > 0), hop: i >= serverRolledFrom });

    if (!isActive(currentAttacker)) break;
  }

  if (chain && allBattleActions.find((e) => e.actionType === "attack")?.actionDetails.isHit) {
    const hit = new Set([targets[0].basicInfo.id]);

    let from = findParticipant(currentInitiativeOrder, targets[0].basicInfo.id) ?? targets[0];

    for (let jump = 1; jump <= chainJumps && isActive(currentAttacker); jump++) {
      const next = nextChainTarget({ map: input.map, order: currentInitiativeOrder, attacker: currentAttacker, attack, from, hit });

      if (!next) break;

      const result = strikeAt(next, jump, { serverD20: true, multiplier: chainPercent ** jump, cover: false, hop: true });

      result.battleAction.actionDetails.chainFromId = from.basicInfo.id;
      hit.add(next.basicInfo.id);

      if (!result.success) break;

      from = findParticipant(currentInitiativeOrder, next.basicInfo.id) ?? next;
    }
  }

  return {
    finalInitiativeOrder: restoreHeldBack(currentInitiativeOrder, attacker.basicInfo.id, heldBack),
    allBattleActions,
    summons,
  };
}
