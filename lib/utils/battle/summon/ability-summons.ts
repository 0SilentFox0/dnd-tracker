import type { Prisma } from "@prisma/client";

import type { SummonRequest } from "@/lib/utils/abilities/engine/types";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant";
import { appendToInitiativeEnd, nextInstanceNumber } from "@/lib/utils/battle/spell/append-summoned-unit";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import { scaleSummon } from "@/lib/utils/units/level-scaling";
import type { BattleParticipant } from "@/types/battle";

type RaceRow = Prisma.RaceGetPayload<object>;

export interface SummonPool {
  units: Omit<UnitFromPrisma, "createdAt">[];
  races: Pick<RaceRow, "id" | "campaignId" | "name" | "abilities" | "passiveAbility">[];
}

export interface SummonDeps {
  loadPool(campaignId: string): Promise<SummonPool>;
}

export async function applyAbilitySummons(
  requests: SummonRequest[],
  order: BattleParticipant[],
  opts: { campaignId: string; battleId: string; rng: () => number; deps: SummonDeps },
): Promise<{ order: BattleParticipant[]; messages: string[] }> {
  if (requests.length === 0) return { order, messages: [] };

  const pool = await opts.deps.loadPool(opts.campaignId);

  const racesById = Object.fromEntries(pool.races.map((r) => [r.id, r]));

  const messages: string[] = [];

  let next = order;

  for (const req of requests) {
    const owner = next.find((p) => p.basicInfo.id === req.ownerId);

    const group = (req.group ?? "").trim().toLowerCase();

    const candidates = req.unitId
      ? pool.units.filter((u) => u.id === req.unitId)
      : pool.units.filter((u) => u.level === req.tier && (racesById[u.raceId ?? ""]?.name ?? "").trim().toLowerCase() === group);

    if (!owner || candidates.length === 0) {
      messages.push(req.unitId ? "обраного юніта не знайдено" : `немає юніта групи ${req.group} Tier ${req.tier}`);
      continue;
    }

    const names: string[] = [];

    for (let i = 0; i < req.count; i++) {
      const unit = candidates[Math.min(candidates.length - 1, Math.floor(opts.rng() * candidates.length))];

      const built = await createBattleParticipantFromUnit(unit as UnitFromPrisma, opts.battleId, owner.basicInfo.side, nextInstanceNumber(next, unit.id), racesById as Record<string, RaceRow>);

      const scaled = scaleSummon(built, unit.levelScaling, req.casterLevel);

      const withOwner = { ...scaled, basicInfo: { ...scaled.basicInfo, controlledBy: owner.basicInfo.controlledBy }, battleData: { ...scaled.battleData, summonedBy: req.ownerId } };

      const { finalOrder, added } = appendToInitiativeEnd(next, withOwner);

      next = finalOrder;
      names.push(added.basicInfo.name);
    }

    messages.push(`🌀 прикликано: ${names.join(", ")}`);
  }

  return { order: next, messages };
}
