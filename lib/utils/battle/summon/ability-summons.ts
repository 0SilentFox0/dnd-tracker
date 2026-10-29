import { textRef } from "@/lib/i18n/text-ref";
import { findFlags } from "@/lib/utils/abilities/engine/core/collect-modifiers";
import { findParticipant, isActive, withSelf } from "@/lib/utils/abilities/engine/core/participants";
import type { SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant";
import { appendToInitiativeEnd, nextInstanceNumber } from "@/lib/utils/battle/summon/append-summoned-unit";
import { buildInlineSummon } from "@/lib/utils/battle/summon/inline-summon";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import { pickOne } from "@/lib/utils/common/dice";
import type { Ruleset } from "@/lib/utils/rules";
import { scaleSummon } from "@/lib/utils/units/level-scaling";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";
import type { RaceRow } from "@/types/races";
import type { LogLine } from "@/types/text";

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
function banish(order: BattleParticipant[], summoned: BattleParticipant): { participant: BattleParticipant; message?: LogLine } {
  const banishers = order.filter((p) => isActive(p) && p.basicInfo.side !== summoned.basicInfo.side);

  const percent = Math.max(0, ...banishers.flatMap((p) => findFlags(order, p.basicInfo.id, "banishSummons").map((f) => f.percent)));

  if (percent === 0) return { participant: summoned };

  const currentHp = Math.max(1, Math.ceil((summoned.combatStats.currentHp * (100 - percent)) / 100));

  return {
    participant: { ...summoned, combatStats: { ...summoned.combatStats, currentHp } },
    message: textRef("battleLog.summon.banish", { name: summoned.basicInfo.name, percent, hp: currentHp, max: summoned.combatStats.maxHp }),
  };
}

export async function applyAbilitySummons(
  requests: SummonRequest[],
  order: BattleParticipant[],
  opts: { campaignId: string; battleId: string; rng: () => number; rules?: Ruleset; deps: SummonDeps; map?: BattleMapConfig | null; round?: number },
): Promise<{ order: BattleParticipant[]; messages: LogLine[] }> {
  if (requests.length === 0) return { order, messages: [] };

  const pool = requests.some((r) => !r.inline) ? await opts.deps.loadPool(opts.campaignId) : { units: [], races: [] };

  const racesById = Object.fromEntries(pool.races.map((r) => [r.id, r]));

  const messages: LogLine[] = [];

  let next = order;

  for (const req of requests) {
    const owner = findParticipant(next, req.ownerId);

    if (req.inline && owner) {
      const names: string[] = [];

      for (let i = 1; i <= req.count; i++) {
        const built = await buildInlineSummon({ req: { ...req, inline: req.inline }, owner, order: next, number: i, opts });

        const { finalOrder, added } = appendToInitiativeEnd(next, built);

        next = finalOrder;
        names.push(added.basicInfo.name);
      }

      messages.push(textRef("battleLog.summon.appears", { names: names.join(", ") }));

      continue;
    }

    const group = (req.group ?? "").trim().toLowerCase();

    const candidates = req.unitId
      ? pool.units.filter((u) => u.id === req.unitId)
      : pool.units.filter((u) => u.level === req.tier && (racesById[u.raceId ?? ""]?.name ?? "").trim().toLowerCase() === group);

    if (!owner || candidates.length === 0) {
      messages.push(req.unitId ? textRef("battleLog.summon.unitNotFound") : textRef("battleLog.summon.noGroup", { group: req.group ?? "", tier: req.tier ?? "" }));
      continue;
    }

    const names: string[] = [];

    const count = req.count + extraSummons(next, owner, req.spellId);

    const banished: LogLine[] = [];

    for (let i = 0; i < count; i++) {
      const unit = pickOne(candidates, opts.rng);

      const built = await createBattleParticipantFromUnit(unit as UnitFromPrisma, opts.battleId, owner.basicInfo.side, nextInstanceNumber(next, unit.id), racesById as Record<string, RaceRow>, opts.rules);

      const scaled = scaleSummon(built, unit.levelScaling, req.casterLevel);

      const withOwner = { ...scaled, basicInfo: { ...scaled.basicInfo, controlledBy: owner.basicInfo.controlledBy }, battleData: { ...scaled.battleData, summonedBy: req.ownerId } };

      const weakened = banish(next, withOwner);

      if (weakened.message) banished.push(weakened.message);

      const { finalOrder, added } = appendToInitiativeEnd(next, weakened.participant);

      next = finalOrder;
      names.push(added.basicInfo.name);
    }

    messages.push(textRef("battleLog.summon.summoned", { names: names.join(", ") }), ...banished);
  }

  return { order: next, messages };
}
