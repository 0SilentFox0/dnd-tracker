import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { resolveDowned } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import { isZoneConcentrationLive } from "@/lib/utils/battle/concentration";
import { canStand, cellDistance, cellKey, footprint, movementBudget, parseCellKey, sizeOf } from "@/lib/utils/battle/grid";
import { replaceTerrain } from "@/lib/utils/battle/grid/terrain";
import { rollSave } from "@/lib/utils/battle/saves/roll-save";
import type { Ruleset } from "@/lib/utils/rules";
import type { ZoneTrigger } from "@/lib/utils/spells/model/schema";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleMapConfig, BattleParticipant, GridPoint, SpellZoneRuntime } from "@/types/battle";

type TriggerKind = "onEnter" | "onTurnStart" | "onExit";

interface ZoneCtx {
  map: BattleMapConfig;
  round: number;
  rng: Rng;
  rules?: Ruleset;
}

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

const zoneAbility = (id: string, zone: SpellZoneRuntime): ResolvedAbility =>
  ({ id: `zone-${id}`, name: zone.spellName, trigger: { event: "spellCast", phase: "after", role: "caster" }, effects: [], stackable: false, key: `spell:${zone.spellId}`, source: { type: "skill", id: zone.spellId, name: zone.spellName } }) as ResolvedAbility;

const hitKey = (zoneId: string, kind: TriggerKind) => `${zoneId}:${kind === "onExit" ? "out" : "in"}`;

interface Fired {
  participants: BattleParticipant[];
  messages: string[];
  failed: boolean;
}

function fire(ps: BattleParticipant[], zoneId: string, kind: TriggerKind, targetId: string, ctx: ZoneCtx): Fired {
  const zone = ctx.map.spellZones?.[zoneId];

  const trigger: ZoneTrigger | undefined = zone?.triggers[kind];

  const target = findParticipant(ps, targetId);

  const owner = zone && findParticipant(ps, zone.casterId);

  const none: Fired = { participants: ps, messages: [], failed: false };

  if (!zone || !trigger || !target || !owner || !isActive(target) || !isZoneConcentrationLive(ps, zone.concentrationOf)) return none;

  if (zone.side === "enemies" && target.basicInfo.side === owner.basicInfo.side) return none;

  const once = kind !== "onTurnStart";

  const key = hitKey(zoneId, kind);

  if (once && target.battleData.zoneHits?.[key] === ctx.round) return none;

  let next = once ? replaceParticipant(ps, { ...target, battleData: { ...target.battleData, zoneHits: { ...Object.fromEntries(Object.entries(target.battleData.zoneHits ?? {}).filter(([, r]) => r >= ctx.round - 1)), [key]: ctx.round } } }) : ps;

  const messages: string[] = [];

  if (trigger.save) {
    const res = rollSave({ target: findParticipant(next, targetId) ?? target, ability: trigger.save.ability, dc: zone.dc, participants: next, rules: ctx.rules, rng: ctx.rng, vsSpell: true });

    messages.push(`🎲 ${target.basicInfo.name}: «${zone.spellName}» — рятівний ${trigger.save.ability.toUpperCase()} ${res.total} проти СК ${zone.dc}: ${res.success ? "успіх" : "провал"}`);

    if (res.success) return { participants: next, messages, failed: false };
  }

  const event = { type: "spellCast" as const, phase: "after" as const, actorId: zone.casterId, targetIds: [targetId] };

  trigger.effects.forEach((effect, i) => {
    const r = applyEffect({ participants: next, ability: zoneAbility(zoneId, zone), effectIndex: 200 + i, ownerId: zone.casterId, effect, targetIds: [targetId], event, ctx: { round: ctx.round, rng: ctx.rng, map: ctx.map, rules: ctx.rules } });

    next = r.participants;
    messages.push(...r.messages);

    for (const downed of r.downed ?? []) {
      const d = resolveDowned(next, downed, { round: ctx.round, rng: ctx.rng, rules: ctx.rules });

      next = d.participants;
      messages.push(...d.messages);
    }
  });

  return { participants: next, messages, failed: true };
}

export function zoneTurnStart(map: BattleMapConfig | null | undefined, ps: BattleParticipant[], targetId: string, ctx: Omit<ZoneCtx, "map">): { participants: BattleParticipant[]; messages: string[] } {
  const target = findParticipant(ps, targetId);

  if (!map?.spellZones || !target) return { participants: ps, messages: [] };

  let next = ps;

  const messages: string[] = [];

  for (const id of zonesAt(map, target)) {
    const fired = fire(next, id, "onTurnStart", targetId, { ...ctx, map });

    next = fired.participants;
    messages.push(...fired.messages);
  }

  return { participants: next, messages };
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
  messages: string[];
}

/** Тригери зон на шляху: вхід, вихід (невдалий кидок із pull зупиняє мувера біля центру). `path` — клітинки після старту. */
export function zoneMove(args: { map: BattleMapConfig; participants: BattleParticipant[]; moved: BattleParticipant; from: GridPoint; path: GridPoint[] } & Omit<ZoneCtx, "map">): ZoneMoveResult {
  const { map, from, path, ...ctx } = args;

  let ps = args.participants;

  let moved = args.moved;

  const messages: string[] = [];

  if (!map.spellZones) return { participants: ps, moved, messages };

  const id = moved.basicInfo.id;

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

        return { participants: replaceParticipant(ps, moved), moved, messages: [...messages, `🌀 ${moved.basicInfo.name}: «${map.spellZones[zoneId].spellName}» тягне назад до центру`] };
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
