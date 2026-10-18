import { z } from "zod";

import { applyTerrain, blockedSet, inBounds, occupiedBy } from "@/lib/utils/battle/grid";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";
import type { TerrainCell } from "@/types/battle";

export const mapTerrainSchema = z.object({
  cells: z.array(z.string().regex(/^\d+:\d+$/)).min(1).max(400),
  terrain: z
    .object({
      kind: z.enum(["wall", "barrier", "hazard"]),
      label: z.string().max(60).optional(),
      rounds: z.number().int().min(1).max(20).optional(),
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

  if (!map) throw new BattleRuleError("action_rejected", "У цьому бою немає карти");

  const cells = [...new Set(body.cells)];

  const { terrain } = body;

  let value: TerrainCell | null = null;

  if (terrain) {
    const blocked = blockedSet(map);

    if (cells.some((k) => !inBounds(map, parseKey(k)) || blocked.has(k))) throw new BattleRuleError("action_rejected", REJECTED);

    if (terrain.kind !== "hazard") {
      const occupied = occupiedBy(ctx.participants, () => true);

      if (cells.some((k) => occupied.has(k))) throw new BattleRuleError("action_rejected", REJECTED);
    }

    value = {
      kind: terrain.kind,
      ...(terrain.label && { label: terrain.label }),
      ...(terrain.kind === "barrier" && terrain.rounds !== undefined && { untilRound: ctx.scene.round + terrain.rounds - 1 }),
    };
  }

  return { participants: ctx.participants, pending: ctx.pending, events: [], scene: { map: applyTerrain(map, cells, value) } };
}
