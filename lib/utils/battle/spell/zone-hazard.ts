import { cellKey, cellLine, closestCell, inBounds, parseCellKey } from "@/lib/utils/battle/grid/geometry";
import { occupiedBy } from "@/lib/utils/battle/grid/occupancy";
import { cellsOf, isOnMap } from "@/lib/utils/battle/grid/occupancy";
import { applyTerrain } from "@/lib/utils/battle/grid/terrain";
import type { CastableSpell } from "@/lib/utils/battle/types/spell-process";
import type { CreateTerrainEffect } from "@/lib/utils/spells/model/schema";
import type { BattleMapConfig, BattleParticipant, GridPoint, SpellZoneRuntime, TerrainCell, TerrainDamage } from "@/types/battle";

interface ZoneHazardInput {
  map: BattleMapConfig | null | undefined;
  spell: CastableSpell;
  cells: string[] | undefined;
  round: number;
  spellDamage?: TerrainDamage;
  concentrationOf?: TerrainDamage["concentrationOf"];
  casterId?: string;
  dc?: number;
  centre?: GridPoint;
  castKey?: string;
}

const withZone = (map: BattleMapConfig, id: string, zone: SpellZoneRuntime): BattleMapConfig => ({ ...map, spellZones: { ...map.spellZones, [id]: zone } });

const zoneIdOf = (casterId: string | undefined, spell: CastableSpell, round: number, castKey?: string) => `${castKey ?? `${casterId ?? "dm"}:${spell.id}`}@${round}`;

/** Мапа з небезпекою, туманом чи складною місцевістю, яку лишає zone-закляття шаблоном, або null. */
export function spellZoneHazard({ map, spell, cells, round, spellDamage, concentrationOf, casterId, dc, centre, castKey }: ZoneHazardInput): BattleMapConfig | null {
  const { targeting } = spell.definition;

  const zone = targeting.kind === "template" ? targeting.zone : undefined;

  if (!zone || !map) return null;

  // постійну небезпеку, яку намалював ДМ, зона не перезаписує: інакше вона зникла б разом із зоною
  const zoneCells = cells?.filter((k) => !(map.terrain?.[k]?.kind === "hazard" && map.terrain[k].untilRound === undefined));

  if (!zoneCells?.length) return null;

  const untilRound = round + zone.rounds - 1;

  const zoneId = zoneIdOf(casterId, spell, round, castKey);

  const registers = !!casterId && !!(zone.onEnter || zone.onTurnStart || zone.onExit || concentrationOf);

  const painted = applyTerrain(map, zoneCells, {
    kind: "hazard",
    label: zone.label ?? spell.name,
    untilRound,
    ...((registers || !spellDamage) && { zoneId }),
    ...(zone.terrain?.includes("difficult") && { difficult: true as const }),
    ...(zone.terrain?.includes("obscured") && { obscured: true as const }),
    ...(spellDamage && { damage: { ...spellDamage, spellId: spell.id, ...(casterId && { casterId }), ...(concentrationOf && { concentrationOf }) } }),
  });

  if (!registers || !casterId) return painted;

  return withZone(painted, zoneId, {
    casterId,
    spellId: spell.id,
    spellName: spell.name,
    dc: dc ?? 10,
    side: zone.side ?? "enemies",
    ...(centre && { centre }),
    triggers: { ...(zone.onEnter && { onEnter: zone.onEnter }), ...(zone.onTurnStart && { onTurnStart: zone.onTurnStart }), ...(zone.onExit && { onExit: zone.onExit }) },
    untilRound,
    ...(concentrationOf && { concentrationOf }),
  });
}

interface TerrainEffectInput {
  map: BattleMapConfig | null | undefined;
  effects: CreateTerrainEffect[];
  spell: CastableSpell;
  caster: BattleParticipant;
  participants: BattleParticipant[];
  targetIds: string[];
  cells: string[] | undefined;
  round: number;
  concentrationOf?: TerrainDamage["concentrationOf"];
  dc?: number;
}

function createTerrainCells(effect: CreateTerrainEffect, { map, caster, participants, targetIds, cells }: TerrainEffectInput & { map: BattleMapConfig }): string[] {
  if (effect.shape === "cell") return (cells ?? []).slice(0, effect.cells);

  const target = participants.find((p) => p.basicInfo.id === targetIds[0]);

  if (!target || !isOnMap(caster) || !isOnMap(target)) return [];

  const from = cellsOf(caster);

  const to = cellsOf(target);

  const start = closestCell(from, to);

  const own = new Set([...from, ...to].map(cellKey));

  return cellLine(start, closestCell(to, [start]))
    .filter((c) => !own.has(cellKey(c)) && inBounds(map, c))
    .map(cellKey)
    .slice(0, effect.cells);
}

/** Місцевість, яку створює заклинання (createTerrain), або null. Стіна не займає клітинки з учасниками. */
export function spellTerrainEffects(input: TerrainEffectInput): BattleMapConfig | null {
  const { map, effects, spell, caster, participants, round, concentrationOf, dc } = input;

  if (!map || effects.length === 0) return null;

  let next = map;

  let changed = false;

  const taken = occupiedBy(participants, () => true);

  effects.forEach((effect, i) => {
    const keys = createTerrainCells(effect, { ...input, map }).filter((k) => !(effect.terrain === "wall" && taken.has(k)) && !(next.blocked ?? []).includes(k) && inBounds(next, parseCellKey(k)));

    if (keys.length === 0) return;

    const zoneId = zoneIdOf(caster.basicInfo.id, spell, round, `${spell.id}#${i}`);

    const cell: TerrainCell = { kind: effect.terrain, label: spell.name, untilRound: round + effect.rounds - 1, ...(concentrationOf && { zoneId }) };

    next = applyTerrain(next, keys, cell);
    changed = true;

    if (concentrationOf) next = withZone(next, zoneId, { casterId: caster.basicInfo.id, spellId: spell.id, spellName: spell.name, dc: dc ?? 10, side: "enemies", triggers: {}, untilRound: cell.untilRound as number, concentrationOf });
  });

  return changed ? next : null;
}
