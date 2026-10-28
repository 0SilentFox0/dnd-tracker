import type { z } from "zod";

import type { balanceSchema } from "./balance-schema";
import { loadCharacterBalanceStats } from "./character-stats";

import type { UnitStats } from "@/lib/utils/battle/balance";
import { buildPartyPower, computeFairScaling, heroMember, pickEnemyRoster, unitMember } from "@/lib/utils/battle/balance";
import { loadUnitLibraryStats } from "@/lib/utils/battle/balance/unit-library";
import { pickXpRoster, resolveXpDifficulty, type XpEdition } from "@/lib/utils/battle/balance/xp-budget";
import type { Ruleset } from "@/lib/utils/rules";
import type { AllyStats, SuggestedEnemy } from "@/types/battle-setup";

type BalancePostData = z.infer<typeof balanceSchema>;

const round1 = (n: number) => Math.round(n * 10) / 10;

function xpSuggestion(heroLevels: number[], library: UnitStats[], byId: Map<string, UnitStats>, data: BalancePostData, edition: XpEdition): SuggestedEnemy[] {
  const difficulty = resolveXpDifficulty(edition, data.xpDifficulty);

  const pick = pickXpRoster({ edition, heroLevels, library, difficulty, raceId: data.raceId });

  const u = pick && byId.get(pick.unitId);

  if (!pick || !u) return [];

  return [{ unitId: u.unitId, name: u.name, quantity: pick.quantity, dpr: u.dpr, hp: u.hp, totalDpr: round1(u.dpr * pick.quantity), totalHp: u.hp * pick.quantity, ...(u.xp !== undefined && { xp: u.xp }) }];
}

export async function postBalanceResponse(campaignId: string, data: BalancePostData, rules?: Ruleset) {
  const { allyParticipants, suggest, raceId } = data;

  const [library, heroes] = await Promise.all([
    loadUnitLibraryStats(campaignId, rules),
    allyParticipants.characterIds.length > 0 ? loadCharacterBalanceStats(campaignId, allyParticipants.characterIds) : [],
  ]);

  const members: Parameters<typeof buildPartyPower>[0] = heroes.map(({ stats }) => ({ stats: heroMember(stats), hero: true }));

  let allyCount = heroes.length;

  const byId = new Map(library.map((u) => [u.unitId, u]));

  for (const { id, quantity } of allyParticipants.units) {
    const stats = byId.get(id);

    if (!stats) continue;

    members.push({ stats: unitMember(stats), quantity, hero: false });
    allyCount += quantity;
  }

  const party = buildPartyPower(members);

  const allyStats: AllyStats = {
    dpr: round1(party.dpr),
    totalHp: party.hp,
    kpi: party.hp > 0 ? Math.round((party.dpr / party.hp) * 100) / 100 : 0,
    allyCount,
  };

  const response: { allyStats: AllyStats; suggestedEnemies?: SuggestedEnemy[] } = { allyStats };

  if (suggest && rules?.encounters.balance === "xp") {
    response.suggestedEnemies = xpSuggestion(heroes.map((h) => h.character.level), library, byId, data, rules.encounters.edition);
  } else if (suggest) {
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
