import { getDisabledAttackKinds } from "./disabled-attacks";
import { resolveServerAttack } from "./server-attack";

import { AttackType, EffectMarker } from "@/lib/constants/battle";
import type { CriticalEffect } from "@/lib/constants/critical-effects";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, isActive, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import type { ActionFlow } from "@/lib/utils/battle/common/action-flow";
import { attackKindOf } from "@/lib/utils/battle/common/attack-kind";
import type { CritPicker } from "@/lib/utils/battle/crit-choice/types";
import { hasEffectMarker } from "@/lib/utils/battle/participant/state";
import type { Ruleset } from "@/lib/utils/rules";
import type { SystemSlot } from "@/lib/utils/rules/systems/slot";
import type { BattleAction, BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

type Kind = AttackType;

const kindOf = (a: Pick<BattleAttack, "type">): Kind => attackKindOf(a.type);

export interface CounterStrikeInput {
  participants: BattleParticipant[];
  attackerId: string;
  defenderId: string;
  attack: BattleAttack;
  criticalEffect?: CriticalEffect;
  provoked?: boolean;
  round: number;
  battleId: string;
  rng: Rng;
  crit?: CritPicker;
  map?: BattleMapConfig | null;
  rules: Ruleset;
  sceneState?: SystemSlot;
}

export interface CounterStrikeResult {
  participants: BattleParticipant[];
  battleAction: BattleAction;
  sceneState?: SystemSlot;
}

function weaponFor(defender: BattleParticipant, participants: BattleParticipant[], kind: Kind): { attack: BattleAttack; bonusPercent: number } | null {
  const flags = findFlags(withSelf(participants, defender), defender.basicInfo.id, "counterAttack");

  if (kind === AttackType.RANGED && !flags.some((f) => f.attackKinds.includes(AttackType.RANGED))) return null;

  if (getDisabledAttackKinds(defender)[kind]) return null;

  const attack = defender.battleData.attacks.find((a) => kindOf(a) === kind);

  return attack ? { attack, bonusPercent: flags.reduce((sum, f) => sum + f.bonusPercent, 0) } : null;
}

/** Удар у відповідь основної цілі: без дії, без тригерів «перед/після атаки», без нових відсічей; правило відсічі (ліміти, облік) — у модулі `retaliation`. */
export function counterStrike(input: CounterStrikeInput): CounterStrikeResult | null {
  const { participants, attackerId, defenderId, round, battleId, rng } = input;

  const { provoked } = input;

  if (input.criticalEffect?.effect.type === "ignore_reactions") return null;

  const defender = findParticipant(participants, defenderId);

  const attacker = findParticipant(participants, attackerId);

  if (!defender || !attacker || !isActive(defender) || !isActive(attacker)) return null;

  if (findFlags(withSelf(participants, attacker), attackerId, "noRetaliation").length > 0) return null;

  if (provoked && hasEffectMarker(defender, EffectMarker.NO_REACTION)) return null;

  const weapon = weaponFor(defender, participants, kindOf(input.attack));

  if (!weapon) return null;

  const flow: ActionFlow = { ps: participants, messages: [], summons: [], ctx: { round, rng, map: input.map, rules: input.rules, crit: input.crit }, sceneState: input.sceneState };

  const { battleAction } = resolveServerAttack({ flow, attackerId: defenderId, targetId: attackerId, attack: weapon.attack, currentRound: round, battleId, rng, bonusPercent: weapon.bonusPercent, label: "retaliation" });

  return { participants: flow.ps, battleAction, sceneState: flow.sceneState };
}
