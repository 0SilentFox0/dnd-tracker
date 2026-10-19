import { cellKey, footprint, footprintDistance, parseCellKey } from "./geometry";
import { cellsOf, sizeOf } from "./occupancy";
import { reachable } from "./path";

import { DEFAULT_HAZARD_LABEL } from "@/lib/constants/battle";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { applyRawDamage } from "@/lib/utils/abilities/engine/effects/hp";
import { applyResistance } from "@/lib/utils/battle/resistance";
import { participantImmuneToSpell } from "@/lib/utils/battle/spell/spell-immunity";
import { diceAverage, rollDice } from "@/lib/utils/common/dice";
import type { BattleMapConfig, BattleParticipant, GridPoint, TerrainCell } from "@/types/battle";

const strength = (c: TerrainCell) => (c.damage?.dice ? diceAverage(c.damage.dice) : (c.damage?.amount ?? 0));

function damagingHazards(map: Pick<BattleMapConfig, "terrain">): Map<string, TerrainCell> {
  return new Map(Object.entries(map.terrain ?? {}).filter(([, c]) => c.kind === "hazard" && c.damage));
}

function strongest(cells: (TerrainCell | undefined)[]): TerrainCell | null {
  return cells.reduce<TerrainCell | null>((best, c) => (c && (!best || strength(c) > strength(best)) ? c : best), null);
}

export function hazardUnder(map: BattleMapConfig, p: BattleParticipant, at?: GridPoint): TerrainCell | null {
  const anchor = at ?? p.battleData.position;

  if (!anchor) return null;

  const hazards = damagingHazards(map);

  return strongest(footprint(anchor, sizeOf(p)).map((c) => hazards.get(cellKey(c))));
}

export function hazardOnMove(map: BattleMapConfig, participants: BattleParticipant[], mover: BattleParticipant, to: GridPoint, cost: number): TerrainCell | null {
  const hazards = damagingHazards(map);

  const start = new Set(cellsOf(mover).map(cellKey));

  const entered = strongest(footprint(to, sizeOf(mover)).map((c) => (start.has(cellKey(c)) ? undefined : hazards.get(cellKey(c)))));

  if (entered) return entered;

  const avoid = new Set([...hazards.keys()].filter((k) => !start.has(k)));

  if (avoid.size === 0 || reachable(map, participants, mover, cost, { avoid }).get(cellKey(to)) === cost) return null;

  // точний шлях невідомий: консервативно — найсильніша небезпека в радіусі cost
  const origin = cellsOf(mover);

  return strongest([...avoid].filter((k) => footprintDistance(origin, [parseCellKey(k)]) <= cost).map((k) => hazards.get(k)));
}

export function hazardHit(
  p: BattleParticipant,
  cell: TerrainCell,
  round: number,
  participants: BattleParticipant[],
  rng: Rng,
): { participant: BattleParticipant; message: string; damage: number } | null {
  const hazard = cell.damage;

  if (!hazard || p.battleData.hazardHitRound === round) return null;

  if (hazard.spellId && participantImmuneToSpell(p, hazard.spellId, participants)) return null;

  const raw = hazard.dice ? rollDice(hazard.dice, rng) : (hazard.amount ?? 0);

  const damage = applyResistance(p, raw, hazard.type, { participants, fromSpell: !!hazard.spellId }).finalDamage;

  const hurt = applyRawDamage(p, damage);

  return {
    participant: { ...hurt, battleData: { ...hurt.battleData, hazardHitRound: round } },
    message: `${p.basicInfo.name}: ${damage} ${hazard.type} шкоди від «${cell.label ?? DEFAULT_HAZARD_LABEL}»`,
    damage,
  };
}
