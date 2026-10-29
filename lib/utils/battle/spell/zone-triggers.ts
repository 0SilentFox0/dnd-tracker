import { anchorMove, anchorTurnStart } from "./anchored-zone";
import { type Fired, fireTrigger, type TriggerKind, type ZoneCtx } from "./zone-fire";

import { textRef } from "@/lib/i18n/text-ref";
import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { isZoneConcentrationLive } from "@/lib/utils/battle/concentration";
import { canStand, cellDistance, cellKey, footprint, movementBudget, parseCellKey, sizeOf } from "@/lib/utils/battle/grid";
import { replaceTerrain } from "@/lib/utils/battle/grid/terrain";
import type { BattleMapConfig, BattleParticipant, GridPoint } from "@/types/battle";
import type { LogLine } from "@/types/text";

export function zonesAt(map: BattleMapConfig | null | undefined, p: BattleParticipant, at?: GridPoint): Set<string> {
  const anchor = at ?? p.battleData.position;

  if (!map?.spellZones || !map.terrain || !anchor) return new Set();

  const ids = footprint(anchor, sizeOf(p)).flatMap((c) => {
    const id = map.terrain?.[cellKey(c)]?.zoneId;

    return id && map.spellZones?.[id] ? [id] : [];
  });

  return new Set(ids);
}

/** Прибирає клітинки зон, чия концентрація скінчилась; null — нічого не змінилось. */
export function sweepDeadZones(map: BattleMapConfig | null | undefined, participants: BattleParticipant[]): BattleMapConfig | null {
  if (!map?.spellZones) return null;

  const dead = new Set(Object.entries(map.spellZones).filter(([, z]) => z.concentrationOf && !isZoneConcentrationLive(participants, z.concentrationOf)).map(([id]) => id));

  if (dead.size === 0) return null;

  return replaceTerrain(map, Object.fromEntries(Object.entries(map.terrain ?? {}).filter(([, c]) => !c.zoneId || !dead.has(c.zoneId))));
}

function fire(ps: BattleParticipant[], zoneId: string, kind: TriggerKind, targetId: string, ctx: ZoneCtx): Fired {
  const zone = ctx.map.spellZones?.[zoneId];

  if (!zone) return { participants: ps, messages: [], failed: false };

  const { casterId, spellId, spellName, dc, side, concentrationOf } = zone;

  return fireTrigger(ps, { casterId, spellId, spellName, dc, side, concentrationOf, hitKey: zoneId }, zone.triggers[kind], kind, targetId, ctx);
}

export function zoneTurnStart(map: BattleMapConfig | null | undefined, ps: BattleParticipant[], targetId: string, ctx: Omit<ZoneCtx, "map">): { participants: BattleParticipant[]; messages: LogLine[] } {
  const target = findParticipant(ps, targetId);

  if (!map || !target) return { participants: ps, messages: [] };

  let next = ps;

  const messages: LogLine[] = [];

  for (const id of zonesAt(map, target)) {
    const fired = fire(next, id, "onTurnStart", targetId, { ...ctx, map });

    next = fired.participants;
    messages.push(...fired.messages);
  }

  const anchored = anchorTurnStart(next, targetId, { ...ctx, map });

  return { participants: anchored.participants, messages: [...messages, ...anchored.messages] };
}

function pullTarget(map: BattleMapConfig, ps: BattleParticipant[], mover: BattleParticipant, zoneId: string, centre: GridPoint | undefined, fallback: GridPoint): GridPoint {
  if (!centre) return fallback;

  const inside = Object.entries(map.terrain ?? {}).filter(([, c]) => c.zoneId === zoneId).map(([k]) => parseCellKey(k));

  const free = inside.filter((c) => canStand(map, ps, mover, c) && footprint(c, sizeOf(mover)).every((f) => map.terrain?.[cellKey(f)]?.zoneId === zoneId));

  return free.reduce<GridPoint | null>((best, c) => (!best || cellDistance(c, centre) < cellDistance(best, centre) ? c : best), null) ?? fallback;
}

export interface ZoneMoveResult {
  participants: BattleParticipant[];
  moved: BattleParticipant;
  messages: LogLine[];
}

/** Тригери зон на шляху: вхід, вихід (невдалий кидок із pull зупиняє мувера біля центру). `path` — клітинки після старту. */
export function zoneMove(args: { map: BattleMapConfig; participants: BattleParticipant[]; moved: BattleParticipant; from: GridPoint; path: GridPoint[] } & Omit<ZoneCtx, "map">): ZoneMoveResult {
  const zones = spellZonesMove(args);

  const end = zones.moved.battleData.position;

  const walked = end ? args.path.slice(0, args.path.findIndex((c) => c.x === end.x && c.y === end.y) + 1) : [];

  const anchored = anchorMove({ participants: zones.participants, moved: zones.moved, from: args.from, path: walked, ctx: { map: args.map, round: args.round, rng: args.rng, rules: args.rules } });

  return { participants: anchored.participants, moved: findParticipant(anchored.participants, args.moved.basicInfo.id) ?? zones.moved, messages: [...zones.messages, ...anchored.messages] };
}

function spellZonesMove(args: Parameters<typeof zoneMove>[0]): ZoneMoveResult {
  const { map, from, path, ...ctx } = args;

  let ps = args.participants;

  let moved = args.moved;

  const messages: LogLine[] = [];

  const id = moved.basicInfo.id;

  if (!map.spellZones) return { participants: ps, moved, messages };

  const at = (p: GridPoint) => zonesAt(map, moved, p);

  let prev = at(from);

  let last = from;

  for (const step of path) {
    const cur = at(step);

    for (const zoneId of [...prev].filter((z) => !cur.has(z))) {
      const fired = fire(ps, zoneId, "onExit", id, { ...ctx, map });

      ps = fired.participants;
      messages.push(...fired.messages);
      moved = findParticipant(ps, id) ?? moved;

      if (fired.failed && map.spellZones[zoneId].triggers.onExit?.pull) {
        const stop = pullTarget(map, ps, moved, zoneId, map.spellZones[zoneId].centre, last);

        moved = { ...moved, battleData: { ...moved.battleData, position: stop, movementUsed: Math.max(moved.battleData.movementUsed ?? 0, movementBudget(moved)) } };

        return { participants: replaceParticipant(ps, moved), moved, messages: [...messages, textRef("battleLog.spellFx.zonePull", { name: moved.basicInfo.name, spell: map.spellZones[zoneId].spellName })] };
      }
    }

    for (const zoneId of [...cur].filter((z) => !prev.has(z))) {
      const fired = fire(ps, zoneId, "onEnter", id, { ...ctx, map });

      ps = fired.participants;
      messages.push(...fired.messages);
      moved = findParticipant(ps, id) ?? moved;
    }

    if (!isActive(moved)) break;

    prev = cur;
    last = step;
  }

  return { participants: ps, moved, messages };
}
