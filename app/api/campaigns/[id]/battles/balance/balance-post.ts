/**
 * POST balance: сила союзників і (за `suggest`) підбір складу ворогів для рівного бою.
 */

import type { z } from "zod";

import type { balanceSchema } from "./balance-schema";
import { loadCharacterBalanceStats } from "./character-stats";

import { computeFairScaling, type PartyPower, pickEnemyRoster } from "@/lib/utils/battle/balance";
import { loadUnitLibraryStats } from "@/lib/utils/battle/balance/unit-library";
import type { AllyStats, SuggestedEnemy } from "@/types/battle-setup";

type BalancePostData = z.infer<typeof balanceSchema>;

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function postBalanceResponse(campaignId: string, data: BalancePostData) {
  const { allyParticipants, suggest, raceId } = data;

  const library = await loadUnitLibraryStats(campaignId);

  const party: PartyPower = { dpr: 0, hp: 0, heroCount: 0 };

  if (allyParticipants.characterIds.length > 0) {
    for (const { stats } of await loadCharacterBalanceStats(campaignId, allyParticipants.characterIds)) {
      party.dpr += stats.dpr;
      party.hp += stats.hp;
      party.heroCount += 1;
    }
  }

  const byId = new Map(library.map((u) => [u.unitId, u]));

  for (const { id, quantity } of allyParticipants.units) {
    const stats = byId.get(id);

    if (!stats) continue;

    party.dpr += stats.dpr * quantity;
    party.hp += stats.hp * quantity;
    party.heroCount += quantity;
  }

  const allyStats: AllyStats = {
    dpr: round1(party.dpr),
    totalHp: party.hp,
    kpi: party.hp > 0 ? Math.round((party.dpr / party.hp) * 100) / 100 : 0,
    allyCount: party.heroCount,
  };

  const response: { allyStats: AllyStats; suggestedEnemies?: SuggestedEnemy[] } = { allyStats };

  if (suggest) {
    const pick = pickEnemyRoster(party, library, raceId);

    const roster = pick?.roster ?? [];

    const scaling = computeFairScaling(party, roster, library);

    response.suggestedEnemies = roster.map((r) => {
      const u = byId.get(r.unitId);

      const scale = scaling.units[r.unitId];

      return {
        unitId: r.unitId,
        name: r.name,
        quantity: r.quantity,
        dpr: u?.dpr ?? 0,
        hp: u?.hp ?? 0,
        totalDpr: round1((u?.dpr ?? 0) * r.quantity),
        totalHp: (u?.hp ?? 0) * r.quantity,
        hpMult: Math.round((scale?.hpMult ?? 1) * 100) / 100,
        dmgMult: Math.round((scale?.dmgMult ?? 1) * 100) / 100,
      };
    });
  }

  return response;
}
