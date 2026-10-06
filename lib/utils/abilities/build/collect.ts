import { pickHighestPerLine, resolveAbilities } from "./resolve";

import type { LegacySkillRow } from "@/lib/utils/abilities/legacy/convert-skill";
import { artifactAbilities, artifactSetAbilities, raceAbilities, skillAbilities, unitAbilities } from "@/lib/utils/abilities/legacy/read";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { AbilitySource, ResolvedAbility } from "@/types/abilities";

export type SkillRowLike = LegacySkillRow & { abilities?: unknown; icon?: string | null };

export interface SkillEntry {
  row: SkillRowLike;
  mainSkillId: string | null;
  level: string | null;
  levelNode?: boolean;
  mainSkillSpellGroupId: string | null;
}

export interface RaceRowLike {
  id: string;
  name: string;
  passiveAbility: unknown;
  abilities?: unknown;
}

export interface ArtifactRowLike {
  id: string;
  name: string;
  slot?: string | null;
  icon?: string | null;
  bonuses: unknown;
  modifiers: unknown;
  passiveAbility: unknown;
  abilities?: unknown;
}

export interface ArtifactSetRowLike {
  id: string;
  name: string;
  icon?: string | null;
  setBonus: unknown;
  abilities?: unknown;
}

export interface UnitRowLike {
  id: string;
  name: string;
  specialAbilities: unknown;
  abilities?: unknown;
}

export function inheritSchool(abilities: Ability[], school: string | null): Ability[] {
  if (!school) return abilities;

  return abilities.map((a) => ({
    ...a,
    effects: a.effects.map((e) =>
      e.kind === "damageBonus" && e.filter.kind === "magic" && !e.filter.school ? { ...e, filter: { ...e.filter, school } } : e,
    ),
  }));
}

export function skillSource(entry: SkillEntry): AbilitySource {
  const { row, mainSkillId, level } = entry;

  return {
    type: "skill",
    id: row.id,
    name: row.name,
    icon: row.icon ?? null,
    ...(mainSkillId && level && { line: { mainSkillId, level, ...(entry.levelNode !== undefined && { levelNode: entry.levelNode }) } }),
  };
}

export function pickSkillEntries(skills: SkillEntry[]): SkillEntry[] {
  return pickHighestPerLine(skills.map((item) => ({ item, source: skillSource(item) }))).map((x) => x.item);
}

function raceResolved(race: RaceRowLike | null): ResolvedAbility[] {
  return race ? resolveAbilities({ type: "race", id: race.id, name: race.name }, raceAbilities(race)) : [];
}

export function collectCharacterAbilities(input: {
  skills: SkillEntry[];
  race: RaceRowLike | null;
  artifacts: ArtifactRowLike[];
  completedSets: ArtifactSetRowLike[];
}): ResolvedAbility[] {
  const fromSkills = pickSkillEntries(input.skills).flatMap((entry) =>
    resolveAbilities(skillSource(entry), inheritSchool(skillAbilities(entry.row), entry.row.spellGroupId ?? entry.mainSkillSpellGroupId)),
  );

  const fromArtifacts = input.artifacts.flatMap((a) =>
    resolveAbilities({ type: "artifact", id: a.id, name: a.name, icon: a.icon ?? null }, artifactAbilities(a)),
  );

  const fromSets = input.completedSets.flatMap((s) =>
    resolveAbilities({ type: "artifactSet", id: s.id, name: s.name, icon: s.icon ?? null }, artifactSetAbilities(s)),
  );

  return [...fromSkills, ...raceResolved(input.race), ...fromArtifacts, ...fromSets];
}

export function collectUnitAbilities(unit: UnitRowLike, race: RaceRowLike | null): ResolvedAbility[] {
  return [...resolveAbilities({ type: "unit", id: unit.id, name: unit.name }, unitAbilities(unit)), ...raceResolved(race)];
}
