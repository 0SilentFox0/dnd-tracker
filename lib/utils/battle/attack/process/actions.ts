import type { ComputeHitDamageResult } from "./compute";

import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { dynamicTextRef, textRef } from "@/lib/i18n/text-ref";
import { type CritFlavor, critNameRef } from "@/lib/utils/battle/attack/critical";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { newBattleAction } from "@/lib/utils/battle/common/new-action";
import { lineText, logFields } from "@/lib/utils/battle/log/lines";
import { immunityNote } from "@/lib/utils/battle/resistance";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import type { BattleAction, BattleAttack, BattleParticipant } from "@/types/battle";
import type { LogLine } from "@/types/text";

const critDetails = (effect: CriticalEffect, flavor?: CritFlavor) => ({ id: effect.id, type: effect.type, source: "attack" as const, ...(flavor && flavor.index > 0 && { flavorIndex: flavor.index }) });

const flavorTail = (effect: CriticalEffect, flavor?: CritFlavor): LogLine =>
  flavor && flavor.index > 0 ? textRef("battleLog.attack.critFlavorTail", { flavor: dynamicTextRef(`battleTerms.crits.attack.${effect.type}.${effect.id}.flavor.${flavor.index}`, { attacker: flavor.attacker, target: flavor.target }) }) : "";

const critSummary = (effect: CriticalEffect, flavor: CritFlavor | undefined, isFail: boolean): LogLine =>
  textRef(isFail ? "battleLog.attack.critFail" : "battleLog.attack.critHit", { name: critNameRef(effect), flavor: flavorTail(effect, flavor) });

const plainCrit = textRef("battleLog.attack.critPlain");

const rollDetails = (attack: BattleAttack, d20Roll: number, attackRoll: AttackRollResult, targetAC: number) => ({
  weaponName: attack.name,
  attackKind: attackKindOf(attack.type),
  attackRoll: d20Roll,
  attackBonus: attackRoll.attackBonus,
  totalAttackValue: attackRoll.totalAttackValue,
  targetAC,
});

const damageRollDetails = (attack: BattleAttack, rolls: number[]) =>
  rolls.map((roll) => ({ dice: attack.damageDice, results: [roll], total: roll, damageType: attack.damageType }));

interface AttackActionBase {
  attacker: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  d20Roll: number;
  attackRoll: AttackRollResult;
  targetAC: number;
  messages: LogLine[];
  battleId: string;
  currentRound: number;
}

export interface BuildCriticalFailActionParams extends AttackActionBase {
  criticalEffect: CriticalEffect;
  critFlavor?: CritFlavor;
}

export function buildBattleActionForCriticalFail(p: BuildCriticalFailActionParams): BattleAction {
  const { attacker, target, criticalEffect, critFlavor } = p;

  return newBattleAction(attacker, "attack", { battleId: p.battleId, round: p.currentRound, targets: [target] }, {
    actionDetails: {
      ...rollDetails(p.attack, p.d20Roll, p.attackRoll, p.targetAC),
      isHit: false,
      isCritical: false,
      isCriticalFail: true,
      criticalEffect: critDetails(criticalEffect, critFlavor),
    },
    ...logFields(lineText([textRef("battleLog.attack.critFailHeadline", { attacker: attacker.basicInfo.name, name: critNameRef(criticalEffect), flavor: flavorTail(criticalEffect, critFlavor) }), ...p.messages].filter(Boolean), " | ")),
  });
}

export interface BuildMissActionParams extends AttackActionBase {
  /** Ціль після гарантованої шкоди промаху */
  targetAfter: BattleParticipant;
  guaranteedDamage: number;
}

export function buildBattleActionForMiss(p: BuildMissActionParams): BattleAction {
  const { attacker, target, guaranteedDamage } = p;

  return newBattleAction(attacker, "attack", { battleId: p.battleId, round: p.currentRound, targets: [target] }, {
    actionDetails: {
      ...rollDetails(p.attack, p.d20Roll, p.attackRoll, p.targetAC),
      isHit: false,
      isCritical: false,
      isCriticalFail: p.attackRoll.isCriticalFail,
    },
    ...logFields(lineText([
      textRef("battleLog.attack.miss", { attacker: attacker.basicInfo.name, target: target.basicInfo.name }),
      ...((p.attack.guaranteedDamage ?? 0) > 0 ? [textRef("battleLog.attack.guaranteed", { damage: guaranteedDamage })] : []),
      ...p.messages,
    ].filter(Boolean), " | ")),
    hpChanges:
      guaranteedDamage > 0
        ? [{ participantId: target.basicInfo.id, participantName: target.basicInfo.name, oldHp: target.combatStats.currentHp, newHp: p.targetAfter.combatStats.currentHp, change: guaranteedDamage }]
        : [],
  });
}

export interface BuildHitActionParams extends AttackActionBase {
  damageRolls: number[];
  hitDamage: ComputeHitDamageResult;
  vampirismHeal: number;
  critFlavor?: CritFlavor;
}

export function buildBattleActionForHit(p: BuildHitActionParams): BattleAction {
  const { attacker, target, attack, attackRoll, vampirismHeal, critFlavor } = p;

  const { damageCalculation, physicalDamage, totalFinalDamage, criticalEffectApplied, damageSteps, oldHp } = p.hitDamage;

  const critText: LogLine = criticalEffectApplied ? textRef("battleLog.attack.critSuffix", { summary: critSummary(criticalEffectApplied, critFlavor, false) }) : attackRoll.isCritical ? plainCrit : "";

  return newBattleAction(attacker, "attack", { battleId: p.battleId, round: p.currentRound, targets: [target] }, {
    actionDetails: {
      ...rollDetails(attack, p.d20Roll, attackRoll, p.targetAC),
      isHit: true,
      isCritical: attackRoll.isCritical,
      isCriticalFail: false,
      criticalEffect: criticalEffectApplied ? critDetails(criticalEffectApplied, critFlavor) : undefined,
      damageRolls: damageRollDetails(attack, p.damageRolls),
      totalDamage: physicalDamage,
      damageRows: damageCalculation.breakdown,
      damageSteps: { [target.basicInfo.id]: damageSteps },
    },
    ...logFields(lineText([
      textRef("battleLog.attack.hit", { attacker: attacker.basicInfo.name, target: target.basicInfo.name, damage: totalFinalDamage, crit: critText }),
      vampirismHeal > 0 ? textRef("battleLog.attack.vampirism", { attacker: attacker.basicInfo.name, heal: vampirismHeal }) : "",
      totalFinalDamage === 0 ? immunityNote(target.basicInfo.name, damageSteps) : "",
      ...p.messages,
    ].filter(Boolean), " | ")),
    hpChanges: [
      { participantId: target.basicInfo.id, participantName: target.basicInfo.name, oldHp, newHp: target.combatStats.currentHp, change: totalFinalDamage },
      ...(vampirismHeal > 0
        ? [{ participantId: attacker.basicInfo.id, participantName: attacker.basicInfo.name, oldHp: attacker.combatStats.currentHp - vampirismHeal, newHp: attacker.combatStats.currentHp, change: -vampirismHeal }]
        : []),
    ],
  });
}

/** Ціль загинула від умінь до кидка атаки. */
export function buildAbortedAttackAction(
  attacker: BattleParticipant,
  target: BattleParticipant,
  attack: BattleAttack,
  messages: LogLine[],
  battleId: string,
  currentRound: number,
): BattleAction {
  return newBattleAction(attacker, "attack", { battleId, round: currentRound, targets: [target] }, {
    actionDetails: { weaponName: attack.name, attackKind: attackKindOf(attack.type), isHit: false },
    ...logFields(lineText([textRef("battleLog.attack.aborted", { attacker: attacker.basicInfo.name, target: target.basicInfo.name }), ...messages], " | ")),
  });
}

export interface BuildOffTurnParams {
  retaliator: BattleParticipant;
  target: BattleParticipant;
  attack: BattleAttack;
  attackRoll: AttackRollResult;
  targetAC: number;
  hit: { damageRolls: number[]; hitDamage: ComputeHitDamageResult } | null;
  messages: LogLine[];
  battleId: string;
  currentRound: number;
  critFlavor?: CritFlavor;
  title?: LogLine;
}

export function buildOffTurnAction(p: BuildOffTurnParams): BattleAction {
  const { retaliator, target, attack, attackRoll, hit } = p;

  const d20 = attackRoll.totalAttackValue - attackRoll.attackBonus;

  const crit = attackRoll.isCriticalFail ? attackRoll.criticalEffect : hit?.hitDamage.criticalEffectApplied;

  const critText: LogLine = crit ? textRef("battleLog.attack.critSuffix", { summary: critSummary(crit, p.critFlavor, attackRoll.isCriticalFail) }) : "";

  const head = { title: p.title ?? textRef("battleLog.offTurn.titles.retaliation"), attacker: retaliator.basicInfo.name, target: target.basicInfo.name, d20, crit: critText };

  const summary = hit
    ? textRef("battleLog.offTurn.hit", { ...head, damage: hit.hitDamage.totalFinalDamage, plainCrit: !crit && attackRoll.isCritical ? plainCrit : "" })
    : textRef("battleLog.offTurn.miss", head);

  const immune = hit && hit.hitDamage.totalFinalDamage === 0 ? immunityNote(target.basicInfo.name, hit.hitDamage.damageSteps) : "";

  return newBattleAction(retaliator, "retaliation", { battleId: p.battleId, round: p.currentRound, targets: [target] }, {
    actionDetails: {
      ...rollDetails(attack, d20, attackRoll, p.targetAC),
      isHit: !!hit,
      isCritical: !!hit && attackRoll.isCritical,
      isCriticalFail: attackRoll.isCriticalFail,
      ...(crit && { criticalEffect: critDetails(crit, p.critFlavor) }),
      ...(hit && {
        damageRolls: damageRollDetails(attack, hit.damageRolls),
        totalDamage: hit.hitDamage.physicalDamage,
        damageRows: hit.hitDamage.damageCalculation.breakdown,
        damageSteps: { [target.basicInfo.id]: hit.hitDamage.damageSteps },
      }),
    },
    ...logFields(lineText([summary, immune, ...p.messages].filter(Boolean), " | ")),
  });
}
