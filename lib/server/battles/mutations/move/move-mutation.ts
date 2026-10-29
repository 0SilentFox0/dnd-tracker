import type { z } from "zod";

import { mazeMove } from "./maze-move";
import { resolveMover } from "./resolve-mover";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { DEFAULT_HAZARD_LABEL } from "@/lib/constants/battle";
import { moveSchema } from "@/lib/schemas/battles";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { resolveDowned } from "@/lib/utils/abilities/engine/core/run-abilities";
import { releaseInvalidGrapples } from "@/lib/utils/battle/actions/grapple";
import { resolveMovement5e } from "@/lib/utils/battle/actions/movement";
import { canStand, cellKey, checkReturnToStart, frightenedBlocksMove, hazardHit, hazardOnMove, moveBudget, pathFrom, placeParticipants, searchPaths } from "@/lib/utils/battle/grid";
import { lineText, logFields } from "@/lib/utils/battle/log/lines";
import { activeMapMode, type MapModeKey } from "@/lib/utils/battle/modes";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { hasAnchors } from "@/lib/utils/battle/spell/anchored-zone";
import { zoneMove } from "@/lib/utils/battle/spell/zone-triggers";
import { BattleRuleError, type NewBattleEvent, systemEvent } from "@/lib/utils/battle/store";
import { ruleErrorOf } from "@/lib/utils/battle/store/errors";
import { assertCanAct } from "@/lib/utils/battle/turn";
import { rngOf } from "@/lib/utils/common/rng";
import type { BattleMapConfig, BattleParticipant, GridPoint, TerrainCell } from "@/types/battle";
import type { LogLine } from "@/types/text";


export type MoveBody = z.infer<typeof moveSchema>;

type ModeMove = (ctx: BattleMutationContext, data: MoveBody, map: BattleMapConfig) => MutationResult;

const MODE_MOVES: Partial<Record<MapModeKey, ModeMove>> = { maze: mazeMove };

export function moveMutation(ctx: BattleMutationContext, data: MoveBody): MutationResult {
  const map = ctx.meta.map;

  if (!map) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_NO_MAP);

  const own = MODE_MOVES[activeMapMode(map).key as MapModeKey];

  if (own) return own(ctx, data, map);

  const { participants, mover, ownTurn } = resolveMover(ctx, data.participantId, (ps) => placeParticipants(map, ps));

  if (data.returnToStart) return returnToStart(ctx, participants, mover, ownTurn);

  const { rules } = ctx.meta;

  const at = (p: BattleParticipant, position: GridPoint, movementUsed?: number) => ({ ...p, battleData: { ...p.battleData, position, ...(movementUsed !== undefined && { movementUsed }) } });

  // розстановка ДМ (чужий хід або free) — без бюджету й шляху
  if (!ownTurn || (ctx.isDM && data.free === true)) {
    if (!canStand(map, participants, mover, data.to)) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_CELL_BLOCKED);

    const moved = at(mover, data.to, mover.battleData.movementUsed);

    const placed = replaceParticipant(participants, moved);

    const released = rules.actions.enabled ? releaseInvalidGrapples(placed, map) : { participants: placed, messages: [] };

    return finishMove(ctx, { participants: released.participants, moved, hazard: null, messages: released.messages, events: [] });
  }

  assertCanAct(ctx, mover.basicInfo.id);

  const budget = moveBudget({ map, dmUserId: ctx.isDM ? ctx.userId : null }, mover);

  const search = searchPaths(map, participants, mover, budget);

  const cost = search.cost.get(cellKey(data.to));

  if (cost === undefined) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_UNREACHABLE);

  if (frightenedBlocksMove(map, participants, mover, data.to)) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_FRIGHTENED_NO_APPROACH);

  if (!rules.actions.enabled) {
    const moved = at(mover, data.to, (mover.battleData.movementUsed ?? 0) + cost);

    const hazard = isActive(moved) ? hazardOnMove(map, participants, mover, data.to, cost) : null;

    return finishMove(ctx, { participants: replaceParticipant(participants, moved), moved, hazard, messages: [], events: [], trail: { from: mover.battleData.position, path: pathFrom(search, mover, data.to) ?? [] } });
  }

  const out = resolveMovement5e({ map, participants, mover, to: data.to, path: pathFrom(search, mover, data.to), budget, cost, round: ctx.scene.round, battleId: ctx.scene.id, rules, rng: rngOf(ctx) });

  const hazard = isActive(out.moved) ? hazardOnMove(map, participants, mover, out.destination, out.spent) : null;

  const full = pathFrom(search, mover, data.to) ?? [];

  const stopAt = full.findIndex((c) => cellKey(c) === cellKey(out.destination));

  return finishMove(ctx, { participants: out.participants, moved: out.moved, hazard, messages: out.messages, events: out.events, trail: { from: mover.battleData.position, path: stopAt >= 0 ? full.slice(0, stopAt + 1) : full } });
}

interface MoveOutcome {
  participants: BattleParticipant[];
  moved: BattleParticipant;
  hazard: TerrainCell | null;
  messages: LogLine[];
  events: NewBattleEvent[];
  /** шлях пройдено вільно від from; лише тоді спрацьовують зони заклинань */
  trail?: { from: GridPoint | undefined; path: GridPoint[] };
}

function finishMove(ctx: BattleMutationContext, { participants, moved, hazard, messages, events: attackEvents, trail }: MoveOutcome): MutationResult {
  const events = [...(messages.length ? [systemEvent(ctx.scene.round, lineText(messages, "; "))] : []), ...attackEvents];

  const hit = hazard && hazardHit(moved, hazard, ctx.scene.round, participants, rngOf(ctx), ctx.meta.rules);

  const hazardHitResult = hazard && hit ? resolveHazardHit(ctx, participants, moved, hazard, hit) : null;

  const resolved = { participants: hazardHitResult?.participants ?? participants, events: [...events, ...(hazardHitResult?.events ?? [])] };

  const after = findParticipant(resolved.participants, moved.basicInfo.id);

  const map = ctx.meta.map;

  if (!trail?.from || !map || !(map.spellZones || hasAnchors(resolved.participants)) || !after || !isActive(after)) return { ...resolved, pending: ctx.pending };

  const zones = zoneMove({ map, participants: resolved.participants, moved: after, from: trail.from, path: trail.path, round: ctx.scene.round, rng: ctx.rng ?? Math.random, rules: ctx.meta.rules });

  return { participants: zones.participants, events: [...resolved.events, ...(zones.messages.length ? [systemEvent(ctx.scene.round, lineText(zones.messages, "; "))] : [])], pending: ctx.pending };
}

function returnToStart(ctx: BattleMutationContext, participants: BattleParticipant[], mover: BattleParticipant, ownTurn: boolean): MutationResult {
  const check = ownTurn ? checkReturnToStart(ctx.meta.map, participants, mover) : { ok: false as const, error: API_ERRORS.BATTLE_RETURN_OWN_TURN };

  if (!check.ok) throw ruleErrorOf("action_rejected", check.error);

  assertCanAct(ctx, mover.basicInfo.id);

  const moved = { ...mover, battleData: { ...mover.battleData, position: check.to, returnedThisTurn: true } };

  return { participants: replaceParticipant(participants, moved), pending: ctx.pending, events: [] };
}

function resolveHazardHit(
  ctx: BattleMutationContext,
  participants: BattleParticipant[],
  before: BattleParticipant,
  cell: TerrainCell,
  hit: NonNullable<ReturnType<typeof hazardHit>>,
): Pick<MutationResult, "participants" | "events"> {
  const id = before.basicInfo.id;

  let next = replaceParticipant(hit.participants, hit.participant);

  const messages = [hit.message, ...hit.consequences];

  if (!isActive(hit.participant)) {
    const downed = resolveDowned(next, { victimId: id, actorId: null }, { round: ctx.scene.round, rng: rngOf(ctx), rules: ctx.meta.rules });

    next = downed.participants;
    messages.push(...downed.messages);
  }

  const hp = (findParticipant(next, id) ?? hit.participant).combatStats.currentHp;

  const oldHp = before.combatStats.currentHp;

  const moveText = logFields(lineText(messages, "; "));

  const event: NewBattleEvent = {
    type: "ability",
    round: ctx.scene.round,
    actorId: id,
    targets: [],
    hpChanges: [{ participantId: id, participantName: before.basicInfo.name, oldHp, newHp: hp, change: oldHp - hp }],
    resultText: moveText.resultText,
    details: {
      actorName: before.basicInfo.name,
      actorSide: before.basicInfo.side,
      ...(moveText.log && { log: moveText.log }),
      actionDetails: {
        hazard: { label: cell.label ?? DEFAULT_HAZARD_LABEL, damageType: cell.damage?.type ?? "", damage: hit.damage },
        damageRolls: [{ dice: cell.damage?.dice ?? String(cell.damage?.amount ?? 0), results: [], total: hit.damage, damageType: cell.damage?.type ?? "" }],
      },
    },
  };

  return { participants: next, events: [event] };
}
