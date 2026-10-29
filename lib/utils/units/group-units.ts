import { UNGROUPED_KEY, UNGROUPED_LABELS } from "@/lib/constants/ungrouped";
import { groupBy } from "@/lib/utils/common/collections";
import { byName } from "@/lib/utils/common/text";
import { matchesQuery } from "@/lib/utils/common/text-search";
import type { Race } from "@/types/races";
import type { Unit } from "@/types/units";

export const NO_RACE = "none";

const TYPE_PREFIX = "type:";

export type UnitGroupRace = Pick<Race, "id" | "name" | "color" | "icon">;

export interface UnitTier {
  level: number;
  units: Unit[];
}

export interface UnitRaceGroup<R extends UnitGroupRace = UnitGroupRace> {
  key: string;
  label: string;
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

function toTiers(units: Unit[]): UnitTier[] {
  return [...groupBy(units, (unit) => unit.level).entries()].sort(([a], [b]) => a - b).map(([level, list]) => ({ level, units: list.sort(byName) }));
}

export function groupUnitsByRace<R extends UnitGroupRace>(units: Unit[], races: R[], query = ""): UnitRaceGroup<R>[] {
  const q = query.trim();

  const matches = (unit: Unit) => matchesQuery([unit.name], q);

  const known = new Set(races.map((r) => r.id));

  const group = (key: string, race: R | null, own: Unit[], label = race?.name ?? UNGROUPED_LABELS.race): UnitRaceGroup<R> => ({ key, label, race, total: own.length, tiers: toTiers(own.filter(matches)) });

  const unraced = units.filter((u) => !u.raceId || !known.has(u.raceId));

  const byType = groupBy(unraced, (u) => u.statblock?.creatureType?.trim().toLowerCase() || "");

  const typeGroups = [...byType.entries()]
    .filter(([type]) => type)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, own]) => group(TYPE_PREFIX + type, null, own, type));

  const groups = [
    ...[...races].sort(byName).map((race) => group(race.id, race, units.filter((u) => u.raceId === race.id))),
    ...typeGroups,
    group(NO_RACE, null, byType.get("") ?? []),
  ];

  return q ? groups.filter((g) => g.tiers.length > 0) : groups;
}

export function raceIdOfGroup(key: string): string | null {
  return key === NO_RACE || key.startsWith(TYPE_PREFIX) ? null : key;
}

export const isTypeGroup = (key: string): boolean => key.startsWith(TYPE_PREFIX);

export const creatureTypeOfGroup = (key: string): string | null => (isTypeGroup(key) ? key.slice(TYPE_PREFIX.length) : null);

export function raceChips(groups: UnitRaceGroup[], labelOf: (group: UnitRaceGroup) => string = (g) => g.label): UnitRaceChip[] {
  return groups.map((g) => ({ key: g.key, label: labelOf(g), color: g.race?.color ?? null, count: g.total }));
}

export function groupUnitsByRaceName<U extends { raceName: string | null; level: number }>(units: U[]): Map<string, U[]> {
  const byRace = groupBy(units, (unit) => unit.raceName?.trim() || UNGROUPED_KEY);

  for (const list of byRace.values()) list.sort((a, b) => a.level - b.level);

  return byRace;
}
