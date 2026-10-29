import { isActive } from "@/lib/utils/abilities/engine/core/participants";
import { markKey } from "@/lib/utils/abilities/engine/effects/marks";
import { canReact } from "@/lib/utils/battle/actions/reaction";
import { type ActionFlow, getP } from "@/lib/utils/battle/common/action-flow";
import { cellsOf, footprintDistance, isOnMap } from "@/lib/utils/battle/grid";
import { casterSpellDice } from "@/lib/utils/battle/spell/caster-dice";
import { isGrantLive, withInlineDefinition } from "@/lib/utils/battle/spell/inline-grant";
import type { CastSpellParams, CastSpellResult } from "@/lib/utils/battle/types/spell-process";
import { rollDiceList } from "@/lib/utils/common/dice";
import type { BattleParticipant, SpellGrant } from "@/types/battle";

const CELL_FEET = 5;

const anchoredOn = (target: BattleParticipant, holderId: string, markId: string) =>
  target.battleData.activeEffects.some((e) => e.abilityKey === markKey(markId) && e.source?.participantId === holderId);

const inRange = (grant: SpellGrant, target: BattleParticipant, attacker: BattleParticipant, hasMap: boolean) => {
  const targeting = grant.inline?.targeting;

  const range = targeting && "range" in targeting ? targeting.range : undefined;

  if (range === undefined || !hasMap || !isOnMap(target) || !isOnMap(attacker)) return true;

  return footprintDistance(cellsOf(target), cellsOf(attacker)) * CELL_FEET <= range;
};

export function runAutoReactions(flow: ActionFlow, { attackerId, targetId, targetHpBefore }: { attackerId: string; targetId: string; targetHpBefore: number }, cast: (params: CastSpellParams) => CastSpellResult): void {
  for (const { basicInfo } of flow.ps) {
    const holderId = basicInfo.id;

    const holder = getP(flow, holderId);

    const grant = (holder.spellcasting.grants ?? []).find((g) => g.inline?.auto && g.inline.anchorMarkId);

    const attacker = getP(flow, attackerId);

    const target = getP(flow, targetId);

    if (!grant?.inline?.anchorMarkId || !isGrantLive(grant, flow.ctx.round, flow.ps) || !isActive(attacker)) continue;

    if (targetHpBefore <= 0) continue;

    if (grant.inline.auto?.on === "damageToMarked" && target.combatStats.currentHp >= targetHpBefore) continue;

    if (holderId === attackerId || attacker.basicInfo.side === holder.basicInfo.side) continue;

    if (!canReact(holder) || !anchoredOn(target, holderId, grant.inline.anchorMarkId) || !inRange(grant, target, attacker, !!flow.ctx.map)) continue;

    const spell = withInlineDefinition({ id: grant.spellId, name: grant.label ?? "Реакція", level: 0, groupId: null, definition: { dice: 0, cost: "reaction", targeting: { kind: "self" }, resolution: { kind: "auto" }, effects: [], raceModifiers: [] } }, grant);

    const dice = casterSpellDice(holder, { dice: grant.inline.dice, groupId: null, level: 0, dieSides: grant.inline.dieSides, fixedDice: true });

    const diceRolls = dice.count > 0 ? rollDiceList(`${dice.count}d${dice.sides}`, flow.ctx.rng) : [];

    const result = cast({ caster: holder, spell, targetIds: [attackerId], allParticipants: flow.ps, currentRound: flow.ctx.round, battleId: "auto-reaction", diceRolls, dice, grant, rng: flow.ctx.rng, crit: flow.ctx.crit, map: flow.ctx.map, rules: flow.ctx.rules });

    if (!result.success) continue;

    flow.ps = result.allParticipantsUpdated;
    flow.messages.push(`⚡ ${holder.basicInfo.name}: реакція «${spell.name}» → ${attacker.basicInfo.name}`, ...result.messages);
  }
}
