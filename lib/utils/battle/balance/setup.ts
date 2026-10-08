import { buildPartyPower, computeFairScaling, type FairScaling, type PartyMember, type PartyPower, type Power, unitMember } from "./fair";
import type { UnitStats } from "./stats";

import { ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";

export interface SetupBalanceParticipant {
  id: string;
  type: string;
  side: string;
  quantity?: number;
}

export interface SetupBalanceStats {
  characterStats: Record<string, PartyMember>;
  unitStats: Record<string, { dpr: number; hp: number; kpi: number; name: string; level: number; raceId: string | null; ac?: number; attackBonus?: number; damageKey?: string; resist?: Record<string, number> }>;
}

export function unitLibraryFromStats(unitStats: SetupBalanceStats["unitStats"]): UnitStats[] {
  return Object.entries(unitStats).map(([unitId, u]) => ({
    unitId,
    name: u.name,
    dpr: u.dpr,
    hp: u.hp,
    kpi: u.kpi,
    level: u.level,
    raceId: u.raceId,
    ...(u.ac !== undefined && { ac: u.ac }),
    ...(u.attackBonus !== undefined && { attackBonus: u.attackBonus }),
    ...(u.damageKey !== undefined && { damageKey: u.damageKey }),
    ...(u.resist !== undefined && { resist: u.resist }),
  }));
}

export function setupPartyPower(participants: SetupBalanceParticipant[], stats: SetupBalanceStats): PartyPower {
  const members: Parameters<typeof buildPartyPower>[0] = [];

  for (const p of participants) {
    if (p.side !== ParticipantSide.ALLY) continue;

    if (p.type === ParticipantSourceType.UNIT) {
      const u = stats.unitStats[p.id];

      if (u) members.push({ stats: unitMember(u), quantity: p.quantity ?? 1, hero: false });
    } else {
      const c = stats.characterStats[p.id];

      if (c) members.push({ stats: c, hero: true });
    }
  }

  return buildPartyPower(members);
}

/** The same function the battle start runs, over the lobby roster. */
export function setupFairScaling(participants: SetupBalanceParticipant[], stats: SetupBalanceStats, raceId?: string | null): { party: PartyPower; scaling: FairScaling } {
  const library = unitLibraryFromStats(stats.unitStats);

  const party = setupPartyPower(participants, stats);

  const roster = participants.filter((p) => p.side === ParticipantSide.ENEMY && p.type === ParticipantSourceType.UNIT).map((p) => ({ unitId: p.id, quantity: p.quantity ?? 1 }));

  const fixed = participants.reduce<Power>((a, p) => {
    const s = p.side === ParticipantSide.ENEMY && p.type !== ParticipantSourceType.UNIT ? stats.characterStats[p.id] : undefined;

    return s ? { hp: a.hp + s.hp, dpr: a.dpr + s.dpr } : a;
  }, { hp: 0, dpr: 0 });

  const pool = raceId ? library.filter((u) => u.raceId === raceId) : library;

  return { party, scaling: computeFairScaling(party, roster, library, pool, fixed) };
}

/** The edit page has no race picker: hints follow the race when every enemy unit shares it. */
export function sharedEnemyRace(participants: SetupBalanceParticipant[], stats: SetupBalanceStats | null | undefined): string | null {
  const races = new Set<string | null>();

  for (const p of participants) if (p.side === ParticipantSide.ENEMY && p.type === ParticipantSourceType.UNIT) races.add(stats?.unitStats[p.id]?.raceId ?? null);

  const [only] = races;

  return races.size === 1 ? (only ?? null) : null;
}
