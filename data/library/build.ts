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

const SPELL_REF_FLAGS = new Set(["spellTargeting", "spellImmunity"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function* flagEffects(skill: LibrarySkill): Generator<Record<string, unknown>> {
  for (const ability of skill.abilities) {
    for (const effect of ability.effects) {
      if (isRecord(effect) && effect.kind === "flag" && SPELL_REF_FLAGS.has(String(effect.flag))) yield effect;
    }
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

  for (const race of source.races) checkEntry("Раса", race);

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

    for (const effect of flagEffects(skill)) {
      const spellIds = Array.isArray(effect.spellIds) ? effect.spellIds : [];

      for (const ref of spellIds) {
        if (!spellByKey.has(String(ref))) issues.push(`Скіл «${skill.key}»: заклинання «${String(ref)}» не знайдено`);
      }

      if (typeof effect.school === "string" && !schools.includes(effect.school)) {
        issues.push(`Скіл «${skill.key}»: невідома школа «${effect.school}»`);
      }
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
