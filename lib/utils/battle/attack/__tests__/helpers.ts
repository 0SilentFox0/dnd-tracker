import { AttackType, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { makeParticipant, seq } from "@/lib/utils/abilities/__tests__/fixtures";
import { counterStrike, type CounterStrikeInput, type CounterStrikeResult } from "@/lib/utils/battle/attack/counter-strike";
import { DEFAULT_RULES } from "@/lib/utils/rules";
import { retaliationAfterAttack } from "@/systems/retaliation/rules/after-attack";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleAttack, BattleMapConfig, BattleParticipant } from "@/types/battle";

export type RetaliationInput = CounterStrikeInput & { attackRoll?: { isCriticalFail: boolean } };

/** Retaliation as the module rules it (limits, accounting, crit-fail) on top of the core counter strike; `provoked` bypasses the module like the d20 provocation hook does */
export function resolveRetaliation({ attackRoll, ...input }: RetaliationInput): CounterStrikeResult | null {
  if (input.provoked) return counterStrike(input);

  const out = retaliationAfterAttack({
    participants: input.participants,
    attackerId: input.attackerId,
    defenderId: input.defenderId,
    criticalEffect: input.criticalEffect,
    first: true,
    round: input.round,
    rules: input.rules,
    sceneState: input.sceneState,
    critFail: attackRoll?.isCriticalFail,
    counterStrike: (provoked, from) => {
      const r = counterStrike({ ...input, provoked, ...(from && { participants: from.participants, sceneState: from.sceneState }) });

      return r && { participants: r.participants, actions: [r.battleAction], sceneState: r.sceneState };
    },
  });

  return out && { participants: out.participants, battleAction: out.actions[0], sceneState: out.sceneState };
}

export const SWORD: BattleAttack = { id: "sw", name: "Меч", type: AttackType.MELEE, attackBonus: 5, damageDice: "1d6", damageType: "slashing" };

export function swordUnit(id: string, side: ParticipantSide, abilities?: ResolvedAbility[]): BattleParticipant {
  const p = makeParticipant({ id, side, hp: 300, maxHp: 300, abilities });

  return { ...p, basicInfo: { ...p.basicInfo, sourceType: ParticipantSourceType.UNIT }, battleData: { ...p.battleData, attacks: [SWORD] } };
}

export function retaliate(ps: BattleParticipant[], map?: BattleMapConfig, rng: () => number = seq(0.85)) {
  return resolveRetaliation({ rules: DEFAULT_RULES, participants: ps, attackerId: "a", defenderId: "d", attack: SWORD, attackRoll: { isCriticalFail: false }, round: 1, battleId: "b1", rng, ...(map && { map }) });
}

export function retaliateTimes(ps: BattleParticipant[], tries: number): boolean[] {
  let order = ps;

  return Array.from({ length: tries }, () => {
    const r = retaliate(order);

    if (r) order = r.participants;

    return r !== null;
  });
}
