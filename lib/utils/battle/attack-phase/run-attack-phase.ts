import { holdBackNewEffects, restoreHeldBack } from "./hold-back";
import { type AttackRequest, validateAttackRequest } from "./request";
import { damageDiceCursor, damageFractions, strikeD20 } from "./strike-rolls";
import { resolveAttackTargets } from "./targets";

import { findFlagsMany } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, isActive, mergeParticipants, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng, SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import { processAttack } from "@/lib/utils/battle/attack";
import { activeEffectIds } from "@/lib/utils/battle/attack/consume-effects";
import { resolveRetaliation } from "@/lib/utils/battle/attack/retaliation";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { Ruleset } from "@/lib/utils/rules";
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
  rules?: Ruleset;
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

  const flags = findFlagsMany(withSelf(initiativeOrder, attacker), attacker.basicInfo.id, ["attackHitsAllEnemies", "piercingShot", "multiTargetFalloff"]);

  const { targets, expanded, isMultiTargetRanged, falloff } = resolveAttackTargets({ order: initiativeOrder, attacker, attack, chosen: chosenTargets, targetIds, map: input.map, flags });

  const fractions = damageFractions(targets, attack, { isMultiTargetRanged, falloff });

  let currentAttacker = { ...attacker };

  let currentInitiativeOrder: BattleParticipant[] = initiativeOrder;

  const allBattleActions: BattleAction[] = [];

  const summons: SummonRequest[] = [];

  const damageFormula = isMultiTargetRanged && (targets.length > 1 || expanded) ? heroAttackDamageParts(attacker, attack).formula : null;

  const dice = damageDiceCursor(data.damageRolls, damageFormula, rng);

  const effectsBeforeVolley = activeEffectIds([attacker]);

  const heldBack: ActiveEffect[] = [];

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];

    const chosenAt = expanded ? chosenTargets.findIndex((t) => t.basicInfo.id === target.basicInfo.id) : i;

    const strike = strikeD20(data, request, { index: i, chosenAt, expanded }, rng);

    const strikeDice = dice.next();

    const second = data.secondRolls?.[chosenAt] ?? data.advantageRoll ?? data.disadvantageRoll;

    const attackResult = processAttack({
      attacker: currentAttacker,
      target: findParticipant(currentInitiativeOrder, target.basicInfo.id) ?? target,
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
      damageMultiplier: targets.length > 1 ? fractions[i] : undefined,
      obstacle: data.obstacle,
      map: input.map,
      rules: input.rules,
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
        rules: input.rules,
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

    if (!isActive(currentAttacker)) break;
  }

  return {
    finalInitiativeOrder: restoreHeldBack(currentInitiativeOrder, attacker.basicInfo.id, heldBack),
    allBattleActions,
    summons,
  };
}
