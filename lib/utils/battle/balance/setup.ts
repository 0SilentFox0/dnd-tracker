import { computeFairScaling, type FairScaling, type PartyPower } from "./fair";
import type { UnitStats } from "./stats";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";

export interface SetupBalanceParticipant {
  id: string;
  type: string;
  side: string;
  quantity?: number;
}

export interface SetupBalanceStats {
  characterStats: Record<string, { dpr: number; hp: number }>;
  unitStats: Record<string, { dpr: number; hp: number; kpi: number; name: string; level: number; raceId: string | null }>;
}

export function unitLibraryFromStats(unitStats: SetupBalanceStats["unitStats"]): UnitStats[] {
  return Object.entries(unitStats).map(([unitId, u]) => ({ unitId, name: u.name, dpr: u.dpr, hp: u.hp, kpi: u.kpi, level: u.level, raceId: u.raceId }));
}

export function setupPartyPower(participants: SetupBalanceParticipant[], stats: SetupBalanceStats): PartyPower {
  const party: PartyPower = { dpr: 0, hp: 0, heroCount: 0 };

  for (const p of participants) {
    if (p.side !== ParticipantSide.ALLY) continue;

    const quantity = p.type === ParticipantSourceType.UNIT ? (p.quantity ?? 1) : 1;

    const s = p.type === ParticipantSourceType.UNIT ? stats.unitStats[p.id] : stats.characterStats[p.id];

    if (!s) continue;

    party.dpr += s.dpr * quantity;
    party.hp += s.hp * quantity;

    if (p.type !== ParticipantSourceType.UNIT) party.heroCount += 1;
  }

  return party;
}

/** The same function the battle start runs, over the lobby roster. */
export function setupFairScaling(participants: SetupBalanceParticipant[], stats: SetupBalanceStats, raceId?: string | null): { party: PartyPower; scaling: FairScaling } {
  const library = unitLibraryFromStats(stats.unitStats);

  const party = setupPartyPower(participants, stats);

  const roster = participants.filter((p) => p.side === ParticipantSide.ENEMY && p.type === ParticipantSourceType.UNIT).map((p) => ({ unitId: p.id, quantity: p.quantity ?? 1 }));

  const pool = raceId ? library.filter((u) => u.raceId === raceId) : library;

  return { party, scaling: computeFairScaling(party, roster, library, pool) };
}
