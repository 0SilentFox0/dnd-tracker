import { Prisma } from "@prisma/client";

import { racePassiveAbilities, racePassiveStatModifiers } from "../data/library/build";
import type { LibraryArtifactSet, LibraryBranch, LibraryRace, LibraryUnit } from "../data/library/types";
import { flavor } from "../data/library/unit-abilities";
import { abilityScores, proficiencyForTier } from "../data/library/unit-stats";
import { ARTIFACT_GRID_9 } from "../lib/constants/artifacts";
import type { Ability } from "../lib/utils/abilities/schema";
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

export function racePassiveData(race: LibraryRace, iconUrl?: string) {
  const { name, description, appearanceDescription } = race.passive;

  return {
    passiveAbility: { name, ...(iconUrl && { icon: iconUrl }), description, appearanceDescription, statModifiers: racePassiveStatModifiers(race) },
    abilities: racePassiveAbilities(race),
  };
}

export function findByName<T extends { name: string }>(rows: readonly T[], name: string): T | undefined {
  const lower = name.toLowerCase();

  return rows.find((r) => r.name.toLowerCase() === lower);
}

export function findByNames<T extends { name: string }>(rows: readonly T[], name: string, formerNames: readonly string[] = []): T | undefined {
  for (const n of [name, ...formerNames]) {
    const found = findByName(rows, n);

    if (found) return found;
  }

  return undefined;
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

export function remapSummonUnits<T>(value: T, unitIds: ReadonlyMap<string, string>): T {
  if (Array.isArray(value)) return value.map((v) => remapSummonUnits(v, unitIds)) as T;

  if (typeof value !== "object" || value === null) return value;

  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(value)) {
    out[k] = k === "unitId" && typeof v === "string" && (value as { kind?: unknown }).kind === "summon" ? lookup(unitIds, v, "юніта") : remapSummonUnits(v, unitIds);
  }

  return out as T;
}

export const unitAbilities = (unit: LibraryUnit) => [...unit.abilities, ...(unit.flying ? [flavor("Літає")] : [])];

export function unitRow(unit: LibraryUnit, maps: Pick<IdMaps, "groups" | "spells">, races: ReadonlyMap<string, string>): Omit<Prisma.UnitUncheckedCreateInput, "campaignId"> {
  const scores = abilityScores(unit);

  // Рушій додає до attackBonus атаки модифікатор характеристики й майстерність, а `unit.attackBonus` — уже повний бонус влучання.
  const weaponBonus = (type: string) => unit.attackBonus - proficiencyForTier(unit.tier) - Math.floor(((type === "melee" ? scores.strength : scores.dexterity) - 10) / 2);

  return {
    name: unit.name,
    raceId: unit.raceKey === null ? null : lookup(races, unit.raceKey, "расу"),
    level: unit.tier,
    ...scores,
    armorClass: unit.ac,
    initiative: unit.initiative,
    speed: 30,
    maxHp: unit.hp,
    proficiencyBonus: proficiencyForTier(unit.tier),
    attacks: unit.attacks.map((a) => ({ name: a.name, type: a.type, attackBonus: weaponBonus(a.type), damageDice: a.dice, damageType: a.damageType, maxTargets: a.targets })),
    knownSpells: (unit.spellKeys ?? []).map((key) => lookup(maps.spells, key, "заклинання")),
    abilities: remapRefs(unitAbilities(unit), maps) as unknown as Prisma.InputJsonValue,
    morale: 1,
    maxTargets: Math.max(1, ...unit.attacks.map((a) => a.targets ?? 1)),
    levelScaling: unit.levelScaling ? { ...unit.levelScaling } : Prisma.DbNull,
  };
}

export function mapRaceModifiers(modifiers: { raceKey: string; percent: number }[], races: ReadonlyMap<string, string>) {
  return modifiers.map((m) => ({ raceId: lookup(races, m.raceKey, "расу"), percent: m.percent }));
}

function failBranch(key: string): never {
  throw new Error(`Невідома гілка «${key}» у складі раси`);
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
    branches: race.branchKeys.map((key) => branches.find((b) => b.key === key) ?? failBranch(key)).map((b) => ({
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

export function artifactDescription(entry: { description: string; appearanceDescription: string }): string {
  return `${entry.description}\n\n${entry.appearanceDescription}`;
}

export function artifactRows(set: LibraryArtifactSet, maps: Pick<IdMaps, "groups" | "spells">, icon: (key?: string) => string | undefined) {
  return {
    set: { name: set.name, description: artifactDescription(set), icon: icon(set.iconKey), abilities: remapRefs(set.abilities, maps) as Ability[] },
    artifacts: set.artifacts.map((a) => ({
      name: a.name,
      description: artifactDescription(a),
      slot: (ARTIFACT_GRID_9.find((s) => s.key === a.slot) ?? failSlot(a.slot)).slotType as string,
      rarity: a.rarity as string,
      icon: icon(a.iconKey),
      abilities: remapRefs(a.abilities, maps) as Ability[],
      modifiers: a.modifiers ?? [],
    })),
  };
}

function failSlot(key: string): never {
  throw new Error(`Невідомий слот артефакту «${key}»`);
}
