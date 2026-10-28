import { CombatStatus, ParticipantSide, SYSTEM_ACTOR } from "@/lib/constants/battle";
import { isActive, isEscaped } from "@/lib/utils/abilities/engine/core/participants";
import { restoreCharm } from "@/lib/utils/abilities/engine/effects/charm";
import { clearDeathSaves } from "@/lib/utils/battle/death-saves";
import type { Ruleset } from "@/lib/utils/rules";
import { BattleAction, BattleParticipant } from "@/types/battle";

export interface VictoryCheckResult {
  isVictory: boolean;
  isDefeat: boolean;
  result: "victory" | "defeat" | null;
  awaiting: "victory" | "defeat" | null;
  message: string;
}

/** Зачарований юніт у переможних умовах лишається на своєму початковому боці. */
export function originalSide(p: BattleParticipant): ParticipantSide {
  const origin = p.battleData.charmReturn ?? p.battleData.activeEffects.find((e) => e.charmOrigin)?.charmOrigin;

  return origin?.side ?? p.basicInfo.side;
}

/** Перевіряє умови перемоги. */
export function checkVictoryConditions(
  initiativeOrder: BattleParticipant[],
  reserve: BattleParticipant[] = [],
): VictoryCheckResult {
  const reserveHas = (side: ParticipantSide) => reserve.some((p) => p.basicInfo.side === side);

  // слот екстра-ходу — не окремий учасник
  const real = initiativeOrder.filter((p) => !p.basicInfo.isExtraTurnSlot);

  const allies = real.filter((p) => originalSide(p) === ParticipantSide.ALLY);

  const enemies = real.filter((p) => originalSide(p) === ParticipantSide.ENEMY);

  const allEnemiesDefeated = enemies.every(
    (enemy) => enemy.combatStats.status === CombatStatus.DEAD || enemy.combatStats.status === CombatStatus.UNCONSCIOUS
  );

  const allAlliesDefeated = allies.every(
    (ally) => ally.combatStats.status === CombatStatus.DEAD || ally.combatStats.status === CombatStatus.UNCONSCIOUS
  );

  if (allEnemiesDefeated && enemies.length > 0) {
    if (reserveHas(ParticipantSide.ENEMY)) {
      return { isVictory: false, isDefeat: false, result: null, awaiting: "victory", message: "У резерві ще є вороги — рішення за ДМ" };
    }

    return {
      isVictory: true,
      isDefeat: false,
      result: "victory",
      awaiting: null,
      message: "🎉 Перемога! Всі вороги переможені!",
    };
  }

  // escaped ставить лише режим карти (вихід), тож окремий прапорець режиму не потрібен
  if (allies.some(isEscaped) && !allies.some((a) => isActive(a) && !isEscaped(a))) {
    return { isVictory: false, isDefeat: false, result: null, awaiting: "victory", message: "Усі живі герої вибралися — рішення за ДМ" };
  }

  if (allAlliesDefeated && allies.length > 0) {
    if (reserveHas(ParticipantSide.ALLY)) {
      return { isVictory: false, isDefeat: false, result: null, awaiting: "defeat", message: "У резерві ще є союзники — рішення за ДМ" };
    }

    return {
      isVictory: false,
      isDefeat: true,
      result: "defeat",
      awaiting: null,
      message: "💀 Поразка! Всі союзники переможені!",
    };
  }

  return {
    isVictory: false,
    isDefeat: false,
    result: null,
    awaiting: null,
    message: "",
  };
}

const revivesOnVictory = (p: BattleParticipant) => p.basicInfo.side === ParticipantSide.ALLY && p.combatStats.status === CombatStatus.UNCONSCIOUS;

/** Завершує бій: знімає чари, при перемозі відроджує непритомних союзників. */
export function completeBattle(
  initiativeOrder: BattleParticipant[],
  result: "victory" | "defeat",
  currentRound: number,
  rules?: Ruleset,
): {
  updatedParticipants: BattleParticipant[];
  battleAction: BattleAction;
} {
  const reviveHp = (p: BattleParticipant) => (rules?.outOfCombat.persistResources ? 1 : p.combatStats.maxHp);

  const restored = initiativeOrder.map(restoreCharm);

  const revived = result === "victory" ? restored.filter(revivesOnVictory) : [];

  const updatedParticipants = restored.map((p) =>
    revived.includes(p) ? { ...clearDeathSaves(p), combatStats: { ...p.combatStats, currentHp: reviveHp(p), status: CombatStatus.ACTIVE } } : p,
  );

  const battleAction: BattleAction = {
    id: `battle-complete-${Date.now()}`,
    battleId: "",
    round: currentRound,
    actionIndex: 0,
    timestamp: new Date(),
    ...SYSTEM_ACTOR,
    actionType: "end_turn",
    targets: [],
    actionDetails: { battleResult: result },
    resultText: result === "victory" ? "🎉 Бій завершено! Перемога союзників!" : "💀 Бій завершено! Поразка союзників!",
    hpChanges: revived.map((p) => ({
      participantId: p.basicInfo.id,
      participantName: p.basicInfo.name,
      oldHp: p.combatStats.currentHp,
      newHp: reviveHp(p),
      change: p.combatStats.currentHp - reviveHp(p),
    })),
    isCancelled: false,
  };

  return { updatedParticipants, battleAction };
}
