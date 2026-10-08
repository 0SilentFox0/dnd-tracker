import { AttackType } from "@/lib/constants/battle";
import { restoreCharm } from "@/lib/utils/abilities/engine/charm";
import { isActive } from "@/lib/utils/abilities/engine/participants";
import { runAbilities } from "@/lib/utils/abilities/engine/run-abilities";
import { expireTurnEndEffects } from "@/lib/utils/battle/attack/consume-effects";
import { processAttack } from "@/lib/utils/battle/attack";
import { getDisabledAttackKinds } from "@/lib/utils/battle/attack/disabled-attacks";
import { heroAttackDamageParts } from "@/lib/utils/battle/damage/hero-damage";
import { rollDiceList } from "@/lib/utils/common/dice";
import type { BattleAction, BattleParticipant } from "@/types/battle";

export function berserkBonusOf(p: BattleParticipant): number | undefined {
  return p.battleData.activeEffects.flatMap((e) => e.effects.filter((d) => d.type === "berserk").map((d) => d.value)).at(0);
}

interface BerserkTurnParams {
  participants: BattleParticipant[];
  /** стан учасника до зменшення тривалостей на початку ходу: з нього читаються заборони */
  restrictedBy: BattleParticipant;
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

/** Автоматичний хід теж закінчується: спрацьовують turnEnd-вміння, зачарований повертається на свій бік. */
function finishTurn(participants: BattleParticipant[], actions: BattleAction[], params: BerserkTurnParams) {
  const id = params.participantId;

  const ended = runAbilities(participants, { type: "turnEnd", actorId: id }, { round: params.round, rng: params.rng });

  const order = ended.participants.map((p) => {
    if (p.basicInfo.id !== id) return p;

    const expired = expireTurnEndEffects(p);

    return expired.battleData.charmReturn ? restoreCharm(expired) : expired;
  });

  const turnEnd = ended.messages.length > 0 ? [{ ...note(order.find((p) => p.basicInfo.id === id) as BattleParticipant, { ...params, actionIndex: params.actionIndex + actions.length }, `Кінець ходу: ${ended.messages.join("; ")}`) }] : [];

  return { participants: order, actions: [...actions, ...turnEnd] };
}

export function runBerserkTurn(params: BerserkTurnParams): { participants: BattleParticipant[]; actions: BattleAction[] } {
  const { participants, participantId, rng } = params;

  const berserker = participants.find((p) => p.basicInfo.id === participantId);

  if (!berserker || !isActive(berserker)) return { participants, actions: [] };

  const disabled = getDisabledAttackKinds(params.restrictedBy);

  const attackDisabled = (kind: string) => (kind === AttackType.RANGED ? disabled.ranged : disabled.melee);

  const cannotAct = berserker.actionFlags.hasUsedAction;

  const victims = participants.filter((p) => p.basicInfo.id !== participantId && isActive(p));

  const attack = berserker.battleData.attacks[0];

  if (cannotAct || victims.length === 0 || !attack || attackDisabled(attack.type)) {
    const reason = cannotAct ? "втрачає дію" : "нікого не може атакувати";

    return finishTurn(participants, [note(berserker, params, `🤬 Шал: ${berserker.basicInfo.name} ${reason}`)], params);
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

  return finishTurn(participants.map((p) => updated.get(p.basicInfo.id) ?? p), [{ ...result.battleAction, actionIndex: params.actionIndex, resultText: `🤬 Шал: ${result.battleAction.resultText}` }], params);
}
