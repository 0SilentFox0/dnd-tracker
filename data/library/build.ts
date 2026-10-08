import { BRANCHES } from "./branches";
import { PERSONAL } from "./personal";
import { RACES } from "./races";
import { SPELLS } from "./spells";
import type { Library, LibraryEntry, LibrarySkill, LibrarySource } from "./types";

import { BRANCH_ICONS, SKILL_ICONS } from "@/data/skill-icons";
import { AbilitySchema } from "@/lib/utils/abilities/schema";
import { SpellDefinitionSchema } from "@/lib/utils/spells/model/schema";

export const LIBRARY_COMPLETE = true;

export const MIN_APPEARANCE_LENGTH = 80;

export const LIBRARY_SOURCE: LibrarySource = { spells: SPELLS, branches: BRANCHES, races: RACES, personal: PERSONAL };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function* refs(value: unknown): Generator<{ kind: "spellIds" | "school"; value: unknown }> {
  if (Array.isArray(value)) {
    for (const v of value) yield* refs(v);

    return;
  }

  if (!isRecord(value)) return;

  for (const [k, v] of Object.entries(value)) {
    if (k === "spellIds" && Array.isArray(v)) for (const id of v) yield { kind: "spellIds", value: id };
    else if (k === "school") yield { kind: "school", value: v };
    else yield* refs(v);
  }
}

export function branchSkills(branch: LibrarySource["branches"][number]): LibrarySkill[] {
  return [...branch.levels, ...branch.slots.flat(), ...branch.spares];
}

export function raceSkills(race: LibrarySource["races"][number]): LibrarySkill[] {
  return [...race.levels, race.ultimate];
}

export function buildLibrary(source: LibrarySource = LIBRARY_SOURCE): Library {
  const issues: string[] = [];

  const skills = [...source.branches.flatMap(branchSkills), ...source.races.flatMap(raceSkills), ...source.personal];

  const icons = new Set([...Object.keys(SKILL_ICONS), ...Object.keys(BRANCH_ICONS)]);

  const checkEntry = (kind: string, entry: LibraryEntry) => {
    const label = `${kind} «${entry.key}»`;

    if (!entry.key.trim()) issues.push(`${kind}: порожній key (${entry.name})`);

    if (!entry.name.trim()) issues.push(`${label}: порожня назва`);

    if (!entry.description.trim()) issues.push(`${label}: порожній опис`);

    if (entry.appearanceDescription.trim().length < MIN_APPEARANCE_LENGTH) {
      issues.push(`${label}: опис вигляду коротший за ${MIN_APPEARANCE_LENGTH} символів`);
    }

    if (entry.iconKey !== undefined && !icons.has(entry.iconKey)) issues.push(`${label}: невідомий iconKey «${entry.iconKey}»`);
  };

  const checkUnique = (kind: string, field: "key" | "name", items: LibraryEntry[]) => {
    const seen = new Set<string>();

    for (const item of items) {
      if (seen.has(item[field])) issues.push(`${kind}: дублікат ${field} «${item[field]}»`);

      seen.add(item[field]);
    }
  };

  const spellByKey = new Map(source.spells.map((s) => [s.key, s]));

  const raceByKey = new Map(source.races.map((r) => [r.key, r]));

  const schools = [...new Set(source.spells.map((s) => s.school))];

  for (const spell of source.spells) {
    checkEntry("Заклинання", spell);

    const parsed = SpellDefinitionSchema.safeParse({
      ...spell.definition,
      raceModifiers: spell.raceModifiers.map((m) => ({ raceId: m.raceKey, percent: m.percent })),
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) issues.push(`Заклинання «${spell.key}»: ${issue.path.join(".")} ${issue.message}`);
    }

    for (const modifier of spell.raceModifiers) {
      if (!raceByKey.has(modifier.raceKey)) issues.push(`Заклинання «${spell.key}»: невідома раса «${modifier.raceKey}»`);
    }
  }

  for (const branch of source.branches) {
    checkEntry("Гілка", branch);

    if (branch.spellSchool !== undefined && !schools.includes(branch.spellSchool)) {
      issues.push(`Гілка «${branch.key}»: невідома школа «${branch.spellSchool}»`);
    }
  }

  for (const race of source.races) {
    checkEntry("Раса", race);

    if (race.branchKeys.length === 0) issues.push(`Раса «${race.key}»: порожній список гілок`);

    if (new Set(race.branchKeys).size !== race.branchKeys.length) issues.push(`Раса «${race.key}»: гілка повторюється`);

    for (const key of race.branchKeys) {
      if (!source.branches.some((b) => b.key === key)) issues.push(`Раса «${race.key}»: невідома гілка «${key}»`);
    }
  }

  for (const skill of skills) {
    checkEntry("Скіл", skill);

    skill.abilities.forEach((ability, i) => {
      const parsed = AbilitySchema.safeParse(ability);

      if (!parsed.success) {
        for (const issue of parsed.error.issues) issues.push(`Скіл «${skill.key}» [${i}]: ${issue.path.join(".")} ${issue.message}`);
      }
    });

    for (const [field, ref] of [["newSpellKey", skill.newSpellKey], ["grantedSpellKey", skill.grantedSpellKey]] as const) {
      if (ref !== undefined && !spellByKey.has(ref)) issues.push(`Скіл «${skill.key}»: ${field} «${ref}» не знайдено`);
    }

    for (const ref of refs(skill.abilities)) {
      if (ref.kind === "spellIds" && !spellByKey.has(String(ref.value))) issues.push(`Скіл «${skill.key}»: заклинання «${String(ref.value)}» не знайдено`);

      if (ref.kind === "school" && !schools.includes(String(ref.value))) issues.push(`Скіл «${skill.key}»: невідома школа «${String(ref.value)}»`);
    }
  }

  checkUnique("Заклинання", "key", source.spells);
  checkUnique("Заклинання", "name", source.spells);
  checkUnique("Гілки", "key", source.branches);
  checkUnique("Гілки", "name", source.branches);
  checkUnique("Раси", "key", source.races);
  checkUnique("Раси", "name", source.races);
  checkUnique("Скіли", "key", skills);
  checkUnique("Скіли", "name", skills);

  if (issues.length > 0) throw new Error(`Бібліотека невалідна:\n${issues.map((i) => `- ${i}`).join("\n")}`);

  return { ...source, schools, skills, spellByKey, raceByKey };
}
