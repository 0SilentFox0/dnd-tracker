import { API_ERRORS } from "@/lib/constants/api-errors";
import { ContentError } from "@/lib/server/content/errors";
import { resolveMapBackgroundForPersistence } from "@/lib/supabase/battle-map-storage";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { BattleRuleError } from "@/lib/utils/battle/store";
import type { MapBackgroundData } from "@/types/api";

export function createMapBackgroundMutation(campaignId: string) {
  return async function mapBackgroundMutation(ctx: BattleMutationContext, body: MapBackgroundData): Promise<MutationResult> {
    const map = ctx.meta.map;

    if (!map) throw new BattleRuleError("action_rejected", API_ERRORS.BATTLE_NO_MAP);

    const resolved = await resolveMapBackgroundForPersistence(body.background, { campaignId, current: map.background });

    if (!resolved.ok) throw new ContentError(resolved.message, 400);

    const { backgroundCols: _cols, gridOffset: _offset, ...rest } = map;

    return {
      participants: ctx.participants,
      pending: ctx.pending,
      events: [],
      scene: { map: { ...rest, background: resolved.background ?? null } },
    };
  };
}
