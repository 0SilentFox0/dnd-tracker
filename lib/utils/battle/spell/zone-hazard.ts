import type { CastableSpell } from "../types/spell-process";

import { applyTerrain } from "@/lib/utils/battle/grid/terrain";
import type { BattleMapConfig, TerrainDamage } from "@/types/battle";

interface ZoneHazardInput {
  map: BattleMapConfig | null | undefined;
  spell: CastableSpell;
  cells: string[] | undefined;
  round: number;
  spellDamage?: TerrainDamage;
}

/** Мапа з небезпекою, яку лишає zone-закляття шаблоном, або null. */
export function spellZoneHazard({ map, spell, cells, round, spellDamage }: ZoneHazardInput): BattleMapConfig | null {
  const { targeting } = spell.definition;

  const zone = targeting.kind === "template" ? targeting.zone : undefined;

  if (!zone || !map) return null;

  // постійну небезпеку, яку намалював ДМ, зона не перезаписує: інакше вона зникла б разом із зоною
  const zoneCells = cells?.filter((k) => !(map.terrain?.[k]?.kind === "hazard" && map.terrain[k].untilRound === undefined));

  if (!zoneCells?.length) return null;

  return applyTerrain(map, zoneCells, {
    kind: "hazard",
    label: zone.label ?? spell.name,
    untilRound: round + zone.rounds - 1,
    ...(spellDamage && { damage: { ...spellDamage, spellId: spell.id } }),
  });
}
