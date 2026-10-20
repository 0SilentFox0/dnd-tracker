import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, isActive, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant";
import { appendToInitiativeEnd, nextInstanceNumber } from "@/lib/utils/battle/summon/append-summoned-unit";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import { pickOne } from "@/lib/utils/common/dice";
import { scaleSummon } from "@/lib/utils/units/level-scaling";
import type { BattleParticipant } from "@/types/battle";
import type { RaceRow } from "@/types/races";

export interface SummonPool {
  units: Omit<UnitFromPrisma, "createdAt">[];
  races: Pick<RaceRow, "id" | "campaignId" | "name" | "abilities" | "passiveAbility">[];
}

export interface SummonDeps {
  loadPool(campaignId: string): Promise<SummonPool>;
}

function extraSummons(order: BattleParticipant[], owner: BattleParticipant, spellId: string | undefined): number {
  if (!spellId) return 0;

  return findFlags(withSelf(order, owner), owner.basicInfo.id, "extraSummons")
    .filter((f) => !f.spellIds || f.spellIds.includes(spellId))
    .reduce((n, f) => n + f.count, 0);
}

/** Найсильніше «Вигнання» серед живих ворогів власника: прикликана істота втрачає частку HP. */
function banish(order: BattleParticipant[], summoned: BattleParticipant): { participant: BattleParticipant; message?: string } {
  const banishers = order.filter((p) => isActive(p) && p.basicInfo.side !== summoned.basicInfo.side);

  const percent = Math.max(0, ...banishers.flatMap((p) => findFlags(order, p.basicInfo.id, "banishSummons").map((f) => f.percent)));

  if (percent === 0) return { participant: summoned };

  const currentHp = Math.max(1, Math.ceil((summoned.combatStats.currentHp * (100 - percent)) / 100));

  return {
    participant: { ...summoned, combatStats: { ...summoned.combatStats, currentHp } },
    message: `🚫 Вигнання: ${summoned.basicInfo.name} −${percent}% HP (${currentHp}/${summoned.combatStats.maxHp})`,
  };
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
    const owner = findParticipant(next, req.ownerId);

    const group = (req.group ?? "").trim().toLowerCase();

    const candidates = req.unitId
      ? pool.units.filter((u) => u.id === req.unitId)
      : pool.units.filter((u) => u.level === req.tier && (racesById[u.raceId ?? ""]?.name ?? "").trim().toLowerCase() === group);

    if (!owner || candidates.length === 0) {
      messages.push(req.unitId ? "обраного юніта не знайдено" : `немає юніта групи ${req.group} Tier ${req.tier}`);
      continue;
    }

    const names: string[] = [];

    const count = req.count + extraSummons(next, owner, req.spellId);

    const banished: string[] = [];

    for (let i = 0; i < count; i++) {
      const unit = pickOne(candidates, opts.rng);

      const built = await createBattleParticipantFromUnit(unit as UnitFromPrisma, opts.battleId, owner.basicInfo.side, nextInstanceNumber(next, unit.id), racesById as Record<string, RaceRow>);

      const scaled = scaleSummon(built, unit.levelScaling, req.casterLevel);

      const withOwner = { ...scaled, basicInfo: { ...scaled.basicInfo, controlledBy: owner.basicInfo.controlledBy }, battleData: { ...scaled.battleData, summonedBy: req.ownerId } };

      const weakened = banish(next, withOwner);

      if (weakened.message) banished.push(weakened.message);

      const { finalOrder, added } = appendToInitiativeEnd(next, weakened.participant);

      next = finalOrder;
      names.push(added.basicInfo.name);
    }

    messages.push(`🌀 прикликано: ${names.join(", ")}`, ...banished);
  }

  return { order: next, messages };
}
