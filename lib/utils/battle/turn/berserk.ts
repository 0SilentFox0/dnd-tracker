import { isActive } from "@/lib/utils/abilities/engine/participants";
import { processAttack } from "@/lib/utils/battle/attack";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { rollDiceList } from "@/lib/utils/common/dice";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export function berserkBonusOf(p: BattleParticipant): number | undefined {
  return p.battleData.activeEffects.flatMap((e) => e.effects.filter((d) => d.type === "berserk").map((d) => d.value)).at(0);
}

interface BerserkTurnParams {
  participants: BattleParticipant[];
  participantId: string;
  bonusPercent: number;
  round: number;
  battleId: string;
  actionIndex: number;
  rng: () => number;
}

function note(p: BattleParticipant, params: BerserkTurnParams, text: string): BattleAction {
  return {
    id: `berserk-${p.basicInfo.id}-${params.round}-${params.actionIndex}`,
    battleId: params.battleId,
    round: params.round,
    actionIndex: params.actionIndex,
    timestamp: new Date(),
    actorId: p.basicInfo.id,
    actorName: p.basicInfo.name,
    actorSide: p.basicInfo.side,
    actionType: "ability",
    targets: [],
    actionDetails: {},
    resultText: text,
    hpChanges: [],
    isCancelled: false,
  };
}

export function runBerserkTurn(params: BerserkTurnParams): { participants: BattleParticipant[]; actions: BattleAction[] } {
  const { participants, participantId, rng } = params;

  const berserker = participants.find((p) => p.basicInfo.id === participantId);

  if (!berserker || !isActive(berserker)) return { participants, actions: [] };

  const victims = participants.filter((p) => p.basicInfo.id !== participantId && isActive(p));

  const attack = berserker.battleData.attacks[0];

  if (victims.length === 0 || !attack) {
    return { participants, actions: [note(berserker, params, `🤬 Шал: ${berserker.basicInfo.name} нікого не може атакувати`)] };
  }

  const target = victims[Math.min(victims.length - 1, Math.floor(rng() * victims.length))];

  const result = processAttack({
    attacker: berserker,
    target,
    attack,
    d20Roll: Math.floor(rng() * 20) + 1,
    damageRolls: rollDiceList(heroAttackDamageParts(berserker, attack).formula, rng),
    allParticipants: participants,
    currentRound: params.round,
    battleId: params.battleId,
    bonusPercent: params.bonusPercent,
    bonusLabel: "Шал",
    rng,
  });

  const updated = new Map((result.allParticipantsUpdated ?? []).map((p) => [p.basicInfo.id, p]));

  return {
    participants: participants.map((p) => updated.get(p.basicInfo.id) ?? p),
    actions: [{ ...result.battleAction, actionIndex: params.actionIndex, resultText: `🤬 Шал: ${result.battleAction.resultText}` }],
  };
}
