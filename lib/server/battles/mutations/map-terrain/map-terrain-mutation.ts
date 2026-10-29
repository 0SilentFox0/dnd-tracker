import type { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { mapTerrainSchema } from "@/lib/schemas/battles";
import { applyTerrain, blockedSet, cellKey, inBounds, occupiedBy } from "@/lib/utils/battle/grid";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";
import type { MapTerrainResponse } from "@/types/api";
import type { TerrainCell } from "@/types/battle";


export type MapTerrainBody = z.infer<typeof mapTerrainSchema>;

const REJECTED = "Клітинка зайнята або поза полем";

const isSpellCell = (c: TerrainCell | undefined) => Boolean(c && (c.zoneId || c.obscured));

function parseKey(key: string) {
  const [x, y] = key.split(":").map(Number);

  return { x, y };
}

export function mapTerrainMutation(ctx: BattleMutationContext, body: MapTerrainBody): MutationResult {
  const map = ctx.meta.map;

  if (!map) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_NO_MAP);

  // "05:6" проходить regex, але рушій і рендер шукають лише канонічні ключі
  const cells = [...new Set(body.cells.map((k) => cellKey(parseKey(k))))];

  const { terrain } = body;

  const base = { participants: ctx.participants, pending: ctx.pending, events: [] };

  if (!terrain) return { ...base, scene: { map: applyTerrain(map, cells.filter((k) => !isSpellCell(map.terrain?.[k])), null) } };

  const blocked = blockedSet(map);

  const occupied = terrain.kind === "hazard" || terrain.kind === "difficult" ? new Set<string>() : occupiedBy(ctx.participants, () => true);

  const usable = (k: string) => inBounds(map, parseKey(k)) && !blocked.has(k) && !occupied.has(k);

  const kept = cells.filter(usable);

  if (kept.length === 0) throw new BattleRuleError("action_rejected", REJECTED);

  const value: TerrainCell = {
    kind: terrain.kind,
    ...(terrain.label && { label: terrain.label }),
    ...(terrain.kind === "barrier" && terrain.rounds !== undefined && { untilRound: ctx.scene.round + terrain.rounds - 1 }),
    ...(terrain.kind === "hazard" && terrain.damage && { damage: terrain.damage }),
  };

  const skipped = cells.filter((k) => !usable(k));

  const response: MapTerrainResponse = { skipped };

  let painted = map;

  for (const k of kept) {
    const old = map.terrain?.[k];

    painted = applyTerrain(painted, [k], { ...value, ...(old?.zoneId && { zoneId: old.zoneId }), ...(old?.obscured && { obscured: true as const }) });
  }

  return { ...base, scene: { map: painted }, ...(skipped.length > 0 && { response: { ...response } }) };
}
