import { getDisabledAttackKinds } from "./disabled-attacks";
import { resolveServerAttack } from "./server-attack";

import { AttackType, EffectMarker } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { findFlags, findFlagsMany } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, isActive, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { type ActionFlow, put } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { CritPicker } from "@/lib/utils/battle/crit-choice/types";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { AttackRollResult } from "@/lib/utils/battle/types/attack";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleAction, BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

type Kind = AttackType;

const kindOf = (a: Pick<BattleAttack, "type">): Kind => attackKindOf(a.type);

export interface RetaliationInput {
  participants: BattleParticipant[];
  attackerId: string;
  defenderId: string;
  attack: BattleAttack;
  attackRoll: Pick<AttackRollResult, "isCriticalFail">;
  criticalEffect?: CriticalEffect;
  provoked?: boolean;
  round: number;
  battleId: string;
  rng: Rng;
  crit?: CritPicker;
  map?: BattleMapConfig | null;
  rules?: Ruleset;
}

export interface RetaliationResult {
  participants: BattleParticipant[];
  battleAction: BattleAction;
}

function weaponFor(defender: BattleParticipant, participants: BattleParticipant[], kind: Kind): { attack: BattleAttack; bonusPercent: number } | null {
  const flags = findFlags(withSelf(participants, defender), defender.basicInfo.id, "counterAttack");

  if (kind === AttackType.RANGED && !flags.some((f) => f.attackKinds.includes(AttackType.RANGED))) return null;

  if (getDisabledAttackKinds(defender)[kind]) return null;

  const attack = defender.battleData.attacks.find((a) => kindOf(a) === kind);

  return attack ? { attack, bonusPercent: flags.reduce((sum, f) => sum + f.bonusPercent, 0) } : null;
}

/** Відсіч основної цілі: без дії, без тригерів «перед/після атаки», без нових відсічей. */
export function resolveRetaliation(input: RetaliationInput): RetaliationResult | null {
  const { participants, attackerId, defenderId, round, battleId, rng } = input;

  const { provoked } = input;

  if ((!provoked && input.attackRoll.isCriticalFail) || input.criticalEffect?.effect.type === "ignore_reactions") return null;

  const defender = findParticipant(participants, defenderId);

  const attacker = findParticipant(participants, attackerId);

  if (!defender || !attacker || !isActive(defender) || !isActive(attacker)) return null;

  if (findFlags(withSelf(participants, attacker), attackerId, "noRetaliation").length > 0) return null;

  const defenderFlags = findFlagsMany(withSelf(participants, defender), defenderId, ["unlimitedRetaliation", "extraRetaliations"]);

  const unlimited = defenderFlags.unlimitedRetaliation.length > 0;

  const allowed = 1 + defenderFlags.extraRetaliations.reduce((n, f) => n + f.count, 0);

  const used = defender.battleData.retaliationsUsed ?? (defender.actionFlags.hasUsedReaction ? 1 : 0);

  if (provoked ? hasEffectMarker(defender, EffectMarker.NO_REACTION) : !unlimited && (defender.actionFlags.hasUsedReaction || used >= allowed)) return null;

  const weapon = weaponFor(defender, participants, kindOf(input.attack));

  if (!weapon) return null;

  const flow: ActionFlow = { ps: participants, messages: [], summons: [], ctx: { round, rng, map: input.map, rules: input.rules, crit: input.crit } };

  if (!provoked && !unlimited) {
    put(flow, {
      ...defender,
      battleData: { ...defender.battleData, retaliationsUsed: used + 1 },
      actionFlags: { ...defender.actionFlags, hasUsedReaction: used + 1 >= allowed },
    });
  }

  const { battleAction } = resolveServerAttack({ flow, attackerId: defenderId, targetId: attackerId, attack: weapon.attack, currentRound: round, battleId, rng, bonusPercent: weapon.bonusPercent, label: "retaliation" });

  return { participants: flow.ps, battleAction };
}
