import { z } from "zod";

import { ParticipantSourceType } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { textRef } from "@/lib/i18n/text-ref";
import {
  createBattleParticipantFromCharacter,
  createBattleParticipantFromUnit,
} from "@/lib/utils/battle/participant";
import { refreshFromSource } from "@/lib/utils/battle/participant/refresh-from-source";
import type { BattleMutationContext, MutationResult } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import { dmEvent } from "@/lib/utils/battle/store";
import type { BattleParticipant } from "@/types/battle";

export const refreshSourcesSchema = z.object({});

type CharacterRow = Parameters<typeof createBattleParticipantFromCharacter>[0] & { campaignId: string };

type UnitRow = Parameters<typeof createBattleParticipantFromUnit>[0] & { campaignId: string };

export interface RefreshSourcesDeps {
  loadCharacter(id: string): Promise<CharacterRow | null>;
  loadUnit(id: string): Promise<UnitRow | null>;
  fromCharacter: typeof createBattleParticipantFromCharacter;
  fromUnit: typeof createBattleParticipantFromUnit;
}

const defaultDeps: RefreshSourcesDeps = {
  loadCharacter: (id) => prisma.character.findUnique({ where: { id }, include: { inventory: true } }) as Promise<CharacterRow | null>,
  loadUnit: (id) => prisma.unit.findUnique({ where: { id } }) as Promise<UnitRow | null>,
  fromCharacter: createBattleParticipantFromCharacter,
  fromUnit: createBattleParticipantFromUnit,
};

const isRealParticipant = (p: BattleParticipant) => !p.basicInfo.isExtraTurnSlot && !p.battleData.summonedBy;

export function createRefreshSourcesMutation(deps: RefreshSourcesDeps = defaultDeps) {
  return async (ctx: BattleMutationContext): Promise<MutationResult> => {
    const { campaignId, id: battleId } = ctx.scene;

    const rows = new Map<string, Promise<CharacterRow | UnitRow | null>>();

    const load = (type: string, id: string) => {
      const key = `${type}:${id}`;

      const cached = rows.get(key);

      if (cached) return cached;

      const loading = type === ParticipantSourceType.CHARACTER ? deps.loadCharacter(id) : deps.loadUnit(id);

      rows.set(key, loading);

      return loading;
    };

    let refreshed = 0;

    const refresh = async (live: BattleParticipant): Promise<BattleParticipant> => {
      const { sourceType, sourceId, side, instanceNumber } = live.basicInfo;

      if (!isRealParticipant(live)) return live;

      if (sourceType !== ParticipantSourceType.CHARACTER && sourceType !== ParticipantSourceType.UNIT) return live;

      const row = await load(sourceType, sourceId);

      if (!row || row.campaignId !== campaignId) return live;

      const fresh =
        sourceType === ParticipantSourceType.CHARACTER
          ? await deps.fromCharacter(row as CharacterRow, battleId, side, instanceNumber, undefined, { rules: ctx.meta.rules })
          : await deps.fromUnit(row as UnitRow, battleId, side, instanceNumber ?? 1, undefined, ctx.meta.rules);

      refreshed++;

      return refreshFromSource(live, fresh);
    };

    const participants = await Promise.all(ctx.participants.map(refresh));

    const pending = await Promise.all(ctx.pending.map(refresh));

    return {
      participants,
      pending,
      events: [dmEvent(ctx.scene.round, textRef("battleLog.dm.refreshed", { count: refreshed }))],
    };
  };
}
