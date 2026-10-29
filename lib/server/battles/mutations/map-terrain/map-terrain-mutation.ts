import { z } from "zod";

import { API_ERRORS } from "@/lib/constants/api-errors";
import { HAZARD_DICE_PATTERN } from "@/lib/constants/battle";
import { DAMAGE_ELEMENT_OPTIONS } from "@/lib/constants/damage";
import { applyTerrain, blockedSet, cellKey, inBounds, occupiedBy } from "@/lib/utils/battle/grid";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";
import type { MapTerrainResponse } from "@/types/api";
import type { TerrainCell } from "@/types/battle";

const HAZARD_DAMAGE_TYPES = DAMAGE_ELEMENT_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const mapTerrainSchema = z.object({
  cells: z.array(z.string().regex(/^\d+:\d+$/)).min(1).max(400),
  terrain: z
    .object({
      kind: z.enum(["wall", "barrier", "hazard", "difficult"]),
      label: z.string().max(60).optional(),
      rounds: z.number().int().min(1).max(20).optional(),
      damage: z.object({ dice: z.string().regex(HAZARD_DICE_PATTERN), type: z.enum(HAZARD_DAMAGE_TYPES) }).optional(),
    })
    .refine((t) => t.kind !== "barrier" || t.rounds !== undefined, { message: "Барʼєру потрібна тривалість у раундах", path: ["rounds"] })
    .nullable(),
});

export type MapTerrainBody = z.infer<typeof mapTerrainSchema>;

const REJECTED = "Клітинка зайнята або поза полем";

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

  if (!terrain) return { ...base, scene: { map: applyTerrain(map, cells, null) } };

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

  return { ...base, scene: { map: applyTerrain(map, kept, value) }, ...(skipped.length > 0 && { response: { ...response } }) };
}
