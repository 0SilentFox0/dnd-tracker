import { pickHighestPerLine, resolveAbilities } from "./resolve";

import { applyClassScale } from "@/lib/utils/abilities/class-columns";
import { artifactAbilities, artifactSetAbilities, raceAbilities, skillAbilities, unitAbilities } from "@/lib/utils/abilities/read";
import type { Ability } from "@/lib/utils/abilities/schema";
import type { ChoiceGroup } from "@/lib/utils/characters/choices/selections";
import { itemStatsFromRow } from "@/lib/utils/items/item-row";
import { consumablePoolKey, itemPoolKey, withItemPool } from "@/lib/utils/items/pools";
import type { AbilitySource, ResolvedAbility } from "@/types/abilities";
import type { ResolvedClassEntry } from "@/types/classes";

export interface SkillRowLike {
  id: string;
  name: string;
  icon?: string | null;
  spellGroupId?: string | null;
  abilities?: unknown;
}

export interface SkillEntry {
  row: SkillRowLike;
  mainSkillId: string | null;
  level: string | null;
  levelNode?: boolean;
  mainSkillSpellGroupId: string | null;
  personal?: boolean;
}

export interface RaceRowLike {
  id: string;
  name: string;
  abilities?: unknown;
}

export interface ArtifactRowLike {
  id: string;
  name: string;
  slot?: string | null;
  icon?: string | null;
  abilities?: unknown;
  modifiers?: unknown;
}

export interface ArtifactSetRowLike {
  id: string;
  name: string;
  icon?: string | null;
  setBonus?: unknown;
  abilities?: unknown;
}

export interface UnitRowLike {
  id: string;
  name: string;
  abilities?: unknown;
}

function inheritSchool(abilities: Ability[], school: string | null): Ability[] {
  if (!school) return abilities;

  return abilities.map((a) => ({
    ...a,
    effects: a.effects.map((e) =>
      e.kind === "damageBonus" && e.filter.kind === "magic" && !e.filter.school ? { ...e, filter: { ...e.filter, school } } : e,
    ),
  }));
}

function skillSource(entry: SkillEntry): AbilitySource {
  const { row, mainSkillId, level } = entry;

  return {
    type: "skill",
    id: row.id,
    name: row.name,
    icon: row.icon ?? null,
    ...(mainSkillId && level && { line: { mainSkillId, level, ...(entry.levelNode !== undefined && { levelNode: entry.levelNode }) } }),
    ...(entry.personal && { personal: true }),
  };
}

function pickSkillEntries(skills: SkillEntry[]): SkillEntry[] {
  return pickHighestPerLine(skills.map((item) => ({ item, source: skillSource(item) }))).map((x) => x.item);
}

function raceResolved(race: RaceRowLike | null): ResolvedAbility[] {
  return race ? resolveAbilities({ type: "race", id: race.id, name: race.name }, raceAbilities(race)) : [];
}

function classResolved(entries: ResolvedClassEntry[]): ResolvedAbility[] {
  return entries.flatMap(({ class: cls, subclass, level }) => {
    if (!cls) return [];

    const upTo = (features: { level: number; abilities: Ability[] }[]) => features.filter((f) => f.level <= level).flatMap((f) => f.abilities);

    // підклас бере колонки, рівень і пули свого класу
    const scale = (abilities: Ability[]) => applyClassScale(abilities, { classId: cls.id, level, columns: cls.columns ?? [] });

    return [
      ...resolveAbilities({ type: "class", id: cls.id, name: cls.name, icon: cls.icon }, scale(upTo(cls.features))),
      ...(subclass ? resolveAbilities({ type: "class", id: subclass.id, name: `${cls.name}: ${subclass.name}` }, scale(upTo(subclass.features))) : []),
    ];
  });
}

export function collectCharacterAbilities(input: {
  skills: SkillEntry[];
  race: RaceRowLike | null;
  artifacts: ArtifactRowLike[];
  completedSets: ArtifactSetRowLike[];
  classes?: ResolvedClassEntry[];
  consumables?: Array<{ itemId: string; row: ArtifactRowLike }>;
  choiceGroups?: readonly ChoiceGroup[];
}): ResolvedAbility[] {
  const fromSkills = pickSkillEntries(input.skills).flatMap((entry) =>
    resolveAbilities(skillSource(entry), inheritSchool(skillAbilities(entry.row), entry.row.spellGroupId ?? entry.mainSkillSpellGroupId)),
  );

  const fromArtifacts = input.artifacts.flatMap((a) => {
    const list = artifactAbilities(a);

    return resolveAbilities({ type: "artifact", id: a.id, name: a.name, icon: a.icon ?? null }, itemStatsFromRow(a)?.charges ? withItemPool(list, itemPoolKey(a.id)) : list);
  });

  const fromSets = input.completedSets.flatMap((s) =>
    resolveAbilities({ type: "artifactSet", id: s.id, name: s.name, icon: s.icon ?? null }, artifactSetAbilities(s)),
  );

  const fromConsumables = (input.consumables ?? []).flatMap(({ itemId, row }) =>
    resolveAbilities({ type: "artifact", id: `consumable:${itemId}`, name: row.name, icon: row.icon ?? null }, withItemPool(artifactAbilities(row), consumablePoolKey(itemId))),
  );

  const fromChoices = (input.choiceGroups ?? []).flatMap((g) => resolveAbilities(g.source, g.scale ? applyClassScale(g.abilities, g.scale) : g.abilities));

  return [...fromSkills, ...raceResolved(input.race), ...classResolved(input.classes ?? []), ...fromChoices, ...fromArtifacts, ...fromSets, ...fromConsumables];
}

export function collectUnitAbilities(unit: UnitRowLike, race: RaceRowLike | null): ResolvedAbility[] {
  return [...resolveAbilities({ type: "unit", id: unit.id, name: unit.name }, unitAbilities(unit)), ...raceResolved(race)];
}
