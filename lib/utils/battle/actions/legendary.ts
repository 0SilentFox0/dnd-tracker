import { reject } from "./errors";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { findParticipant, isAttackable } from "@/lib/utils/abilities/engine/core/participants";
import { getDisabledAttackKinds } from "@/lib/utils/battle/attack/disabled-attacks";
import { resolveServerAttack } from "@/lib/utils/battle/attack/server-attack";
import { assertAttackAllowed } from "@/lib/utils/battle/attack-phase/request";
import type { ActionFlow } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import { attackReachError } from "@/lib/utils/battle/grid/attack-reach";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleAction, BattleMapConfig, BattleParticipant } from "@/types/battle";

export interface LegendaryAttackInput {
  participants: BattleParticipant[];
  actorId: string;
  attackIndex: number;
  targetId: string;
  map: BattleMapConfig | null;
  rules: Ruleset;
  round: number;
  rng: () => number;
  battleId: string;
}

export function legendaryAttack(input: LegendaryAttackInput): { participants: BattleParticipant[]; action: BattleAction; attackName: string } {
  const { participants, actorId, targetId, map, rules, round, rng, battleId } = input;

  const actor = findParticipant(participants, actorId) ?? reject(API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE);

  const attack = actor.battleData.attacks[input.attackIndex] ?? reject("У учасника немає такої атаки");

  if (attack.hand === "off" || getDisabledAttackKinds(actor)[attackKindOf(attack.type)]) return reject("Ця атака зараз недоступна");

  const target = findParticipant(participants, targetId);

  if (!target || target.basicInfo.side === actor.basicInfo.side || !isAttackable(target) || target.battleData.reserved) return reject("Ціллю має бути живий ворог");

  assertAttackAllowed(actor, attack, [target]);

  const reach = attackReachError(map, participants, actor, attack, [target]);

  if (reach) return reject(reach);

  const flow: ActionFlow = { ps: participants, messages: [], summons: [], ctx: { round, rng, map, rules } };

  const { battleAction } = resolveServerAttack({ flow, attackerId: actorId, targetId, attack, currentRound: round, battleId, rng, label: "legendary" });

  return { participants: flow.ps, action: battleAction, attackName: attack.name };
}
