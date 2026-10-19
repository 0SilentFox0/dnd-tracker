import { findParticipant, isTargetable } from "@/lib/utils/abilities/engine/core/participants";
import { apexOf, cellsOf, footprintDistance, isOnMap, participantsInCells, templateCells } from "@/lib/utils/battle/grid";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const NO_MAP_VICTIMS = 2;

export function fireWaveVictims(map: BattleMapConfig | undefined, ps: BattleParticipant[], attacker: BattleParticipant, victimId: string, sizeFt: number): string[] {
  const victim = findParticipant(ps, victimId);

  if (!victim) return [];

  const isEnemy = (p: BattleParticipant) => p.basicInfo.side !== attacker.basicInfo.side && p.basicInfo.id !== victimId && isTargetable(p);

  if (!map || !isOnMap(attacker) || !isOnMap(victim)) return ps.filter(isEnemy).slice(0, NO_MAP_VICTIMS).map((p) => p.basicInfo.id);

  const from = cellsOf(attacker);

  const vc = cellsOf(victim).reduce((best, c) => (footprintDistance(from, [c]) < footprintDistance(from, [best]) ? c : best));

  const ac = apexOf(from, vc);

  const aim = { x: vc.x + Math.sign(vc.x - ac.x), y: vc.y + Math.sign(vc.y - ac.y) };

  const cells = templateCells(map, { shape: "cone", size: sizeFt }, cellsOf(victim), aim);

  return participantsInCells(ps, cells, apexOf(cellsOf(victim), aim))
    .filter(isEnemy)
    .map((p) => p.basicInfo.id);
}
