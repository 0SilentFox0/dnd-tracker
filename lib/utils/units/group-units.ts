import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

export const NO_RACE = "none";

export type UnitGroupRace = Pick<Race, "id" | "name" | "color" | "icon">;

export interface UnitTier {
  level: number;
  units: Unit[];
}

export interface UnitRaceGroup<R extends UnitGroupRace = UnitGroupRace> {
  key: string;
  race: R | null;
  total: number;
  tiers: UnitTier[];
}

export interface UnitRaceChip {
  key: string;
  label: string;
  color: string | null;
  count: number;
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "uk");

function toTiers(units: Unit[]): UnitTier[] {
  const byLevel = new Map<number, Unit[]>();

  for (const unit of units) byLevel.set(unit.level, [...(byLevel.get(unit.level) ?? []), unit]);

  return [...byLevel.entries()].sort(([a], [b]) => a - b).map(([level, list]) => ({ level, units: list.sort(byName) }));
}

export function groupUnitsByRace<R extends UnitGroupRace>(units: Unit[], races: R[], query = ""): UnitRaceGroup<R>[] {
  const q = query.trim().toLocaleLowerCase("uk");

  const matches = (unit: Unit) => !q || unit.name.toLocaleLowerCase("uk").includes(q);

  const known = new Set(races.map((r) => r.id));

  const group = (key: string, race: R | null, own: Unit[]): UnitRaceGroup<R> => ({ key, race, total: own.length, tiers: toTiers(own.filter(matches)) });

  const groups = [
    ...[...races].sort(byName).map((race) => group(race.id, race, units.filter((u) => u.raceId === race.id))),
    group(NO_RACE, null, units.filter((u) => !u.raceId || !known.has(u.raceId))),
  ];

  return q ? groups.filter((g) => g.tiers.length > 0) : groups;
}

export function raceIdOfGroup(key: string): string | null {
  return key === NO_RACE ? null : key;
}

export function raceChips(groups: UnitRaceGroup[]): UnitRaceChip[] {
  return groups.map((g) => ({ key: g.key, label: g.race?.name ?? "Без раси", color: g.race?.color ?? null, count: g.total }));
}

export function groupUnitsByRaceName<U extends { raceName: string | null; level: number }>(units: U[]): Map<string, U[]> {
  const byRace = new Map<string, U[]>();

  for (const unit of units) {
    const key = unit.raceName?.trim() || "Без раси";

    byRace.set(key, [...(byRace.get(key) ?? []), unit]);
  }
  for (const list of byRace.values()) list.sort((a, b) => a.level - b.level);

  return byRace;
}
