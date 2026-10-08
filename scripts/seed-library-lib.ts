import type { LibraryBranch, LibraryRace } from "../data/library/types";
import { type BuildTreeInput } from "../lib/utils/skills/progression/tree-json";

export interface SeedOptions {
  campaignId: string;
  dryRun: boolean;
  allowRemote: boolean;
  replaceTrees: boolean;
}

export interface IdMaps {
  groups: ReadonlyMap<string, string>;
  spells: ReadonlyMap<string, string>;
  races: ReadonlyMap<string, string>;
}

export interface Tally {
  created: number;
  updated: number;
  skipped: number;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function parseArgs(argv: string[]): SeedOptions {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));

  const [campaignId] = argv.filter((a) => !a.startsWith("--"));

  if (!campaignId) throw new Error("Вкажіть campaignId: pnpm seed-library <campaignId> [--dry-run] [--replace-trees] [--allow-remote]");

  return { campaignId, dryRun: flags.has("--dry-run"), allowRemote: flags.has("--allow-remote"), replaceTrees: flags.has("--replace-trees") };
}

export function databaseHost(url: string | undefined): string {
  if (!url) throw new Error("DATABASE_URL не задано");

  return new URL(url).hostname;
}

export function assertSeedTarget(url: string | undefined, allowRemote: boolean): string {
  const host = databaseHost(url);

  if (!LOCAL_HOSTS.has(host) && !allowRemote) {
    throw new Error(`DATABASE_URL вказує на ${host}, не на localhost. Додайте --allow-remote, якщо це свідомо.`);
  }

  return host;
}

export function findByName<T extends { name: string }>(rows: readonly T[], name: string): T | undefined {
  const lower = name.toLowerCase();

  return rows.find((r) => r.name.toLowerCase() === lower);
}

function lookup(map: ReadonlyMap<string, string>, key: string, what: string): string {
  const id = map.get(key);

  if (!id) throw new Error(`Не знайдено ${what} «${key}»`);

  return id;
}

export function remapRefs<T>(value: T, maps: Pick<IdMaps, "groups" | "spells">): T {
  if (Array.isArray(value)) return value.map((v) => remapRefs(v, maps)) as T;

  if (typeof value !== "object" || value === null) return value;

  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(value)) {
    if (k === "spellIds" && Array.isArray(v)) out[k] = v.map((key) => lookup(maps.spells, String(key), "заклинання"));
    else if (k === "school" && typeof v === "string") out[k] = lookup(maps.groups, v, "школу");
    else out[k] = remapRefs(v, maps);
  }

  return out as T;
}

export function mapRaceModifiers(modifiers: { raceKey: string; percent: number }[], races: ReadonlyMap<string, string>) {
  return modifiers.map((m) => ({ raceId: lookup(races, m.raceKey, "расу"), percent: m.percent }));
}

export function treeInput(
  race: LibraryRace,
  branches: LibraryBranch[],
  ids: { skills: ReadonlyMap<string, string>; mainSkills: ReadonlyMap<string, string>; groups: ReadonlyMap<string, string>; branchIcon: (b: LibraryBranch) => string | undefined },
): Omit<BuildTreeInput, "id"> {
  const skill = (key: string) => lookup(ids.skills, key, "скіл");

  const [basic, advanced, expert] = race.levels;

  return {
    race: race.name,
    branches: branches.map((b) => ({
      id: lookup(ids.mainSkills, b.key, "гілку"),
      name: b.name,
      color: b.color,
      icon: ids.branchIcon(b),
      spellGroupId: b.spellSchool ? lookup(ids.groups, b.spellSchool, "школу") : undefined,
      levels: { basic: skill(b.levels[0].key), advanced: skill(b.levels[1].key), expert: skill(b.levels[2].key) },
      outer: b.slots[0].map((s) => skill(s.key)),
      middle: b.slots[1].map((s) => skill(s.key)),
      inner: b.slots[2].map((s) => skill(s.key)),
    })),
    racial: { basic: skill(basic.key), advanced: skill(advanced.key), expert: skill(expert.key) },
    ultimate: skill(race.ultimate.key),
  };
}

export function emptyTally(): Tally {
  return { created: 0, updated: 0, skipped: 0 };
}

export function formatSummary(tallies: Record<string, Tally>): string {
  return Object.entries(tallies)
    .map(([kind, t]) => `${kind.padEnd(12)} створено ${t.created}, оновлено ${t.updated}${t.skipped ? `, пропущено ${t.skipped}` : ""}`)
    .join("\n");
}
