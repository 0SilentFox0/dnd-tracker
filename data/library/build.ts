import { LIBRARY_ARTIFACT_SETS } from "./artifacts";
import { BRANCHES } from "./branches";
import { PERSONAL } from "./personal";
import { RACES } from "./races";
import { SPELLS } from "./spells";
import type { AbilityScoreKey, Library, LibraryEntry, LibraryRace, LibrarySkill, LibrarySource } from "./types";

import { ARTIFACT_ICON_FILES } from "@/data/artifact-icons-map";
import { BRANCH_ICONS, SKILL_ICONS, SPELL_ICONS } from "@/data/skill-icons";
import { ARTIFACT_GRID_9 } from "@/lib/constants/artifacts";
import { type Ability, AbilitySchema } from "@/lib/utils/abilities/schema";
import { SpellDefinitionSchema } from "@/lib/utils/spells/model/schema";

export const LIBRARY_COMPLETE = true;

export const MIN_APPEARANCE_LENGTH = 80;

export const LIBRARY_SOURCE: LibrarySource = { spells: SPELLS, branches: BRANCHES, races: RACES, personal: PERSONAL, artifactSets: LIBRARY_ARTIFACT_SETS };

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

export function racePassiveAbilities(race: LibraryRace): Ability[] {
  const entries = Object.entries(race.passive.stats) as Array<[AbilityScoreKey, number]>;

  const stats: Ability[] =
    entries.length === 0
      ? []
      : [
          {
            id: `${race.key}-stats`,
            name: `${race.name}: характеристики`,
            trigger: { event: "passive" },
            effects: entries.map(([stat, flat]) => ({ kind: "modifyStat", stat, flat })),
          },
        ];

  return [...stats, ...race.passive.trait];
}

export function racePassiveStatModifiers(race: LibraryRace): Record<string, { bonus: true }> {
  return Object.fromEntries(Object.keys(race.passive.stats).map((key) => [key, { bonus: true as const }]));
}

export function buildLibrary(source: LibrarySource = LIBRARY_SOURCE): Library {
  const issues: string[] = [];

  const skills = [...source.branches.flatMap(branchSkills), ...source.races.flatMap(raceSkills), ...source.personal];

  const icons = new Set([...Object.keys(SKILL_ICONS), ...Object.keys(BRANCH_ICONS)]);

  const artifactIcons = new Set(Object.keys(ARTIFACT_ICON_FILES));

  const spellIcons = new Set(Object.keys(SPELL_ICONS));

  const checkEntry = (kind: string, entry: LibraryEntry, iconSet: Set<string> = icons) => {
    const label = `${kind} «${entry.key}»`;

    if (!entry.key.trim()) issues.push(`${kind}: порожній key (${entry.name})`);

    if (!entry.name.trim()) issues.push(`${label}: порожня назва`);

    if (!entry.description.trim()) issues.push(`${label}: порожній опис`);

    if (entry.appearanceDescription.trim().length < MIN_APPEARANCE_LENGTH) {
      issues.push(`${label}: опис вигляду коротший за ${MIN_APPEARANCE_LENGTH} символів`);
    }

    if (entry.iconKey !== undefined && !iconSet.has(entry.iconKey)) issues.push(`${label}: невідомий iconKey «${entry.iconKey}»`);
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

  const checkRefs = (label: string, abilities: Ability[]) => {
    for (const ref of refs(abilities)) {
      if (ref.kind === "spellIds" && !spellByKey.has(String(ref.value))) issues.push(`${label}: заклинання «${String(ref.value)}» не знайдено`);

      if (ref.kind === "school" && !schools.includes(String(ref.value))) issues.push(`${label}: невідома школа «${String(ref.value)}»`);
    }
  };

  const checkAbilities = (prefix: string, abilities: Ability[]) => {
    abilities.forEach((ability, i) => {
      const parsed = AbilitySchema.safeParse(ability);

      if (!parsed.success) {
        for (const issue of parsed.error.issues) issues.push(`${prefix} [${i}]: ${issue.path.join(".")} ${issue.message}`);
      }
    });
  };

  for (const spell of source.spells) {
    checkEntry("Заклинання", spell, spellIcons);

    if (spell.iconKey === undefined) issues.push(`Заклинання «${spell.key}»: немає iconKey`);

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

    for (const [field, text] of [["name", race.passive.name], ["description", race.passive.description]] as const) {
      if (text.trim() === "") issues.push(`Раса «${race.key}»: порожнє passive.${field}`);
    }

    if (race.passive.appearanceDescription.trim().length < MIN_APPEARANCE_LENGTH) {
      issues.push(`Раса «${race.key}»: опис вигляду пасивки коротший за ${MIN_APPEARANCE_LENGTH} символів`);
    }

    if (!icons.has(race.passive.iconKey)) issues.push(`Раса «${race.key}»: невідома іконка пасивки «${race.passive.iconKey}»`);

    if (race.passive.trait.length === 0) issues.push(`Раса «${race.key}»: порожній passive.trait`);

    checkAbilities(`Раса «${race.key}» пасивка`, racePassiveAbilities(race));

    if (race.branchKeys.length === 0) issues.push(`Раса «${race.key}»: порожній список гілок`);

    if (new Set(race.branchKeys).size !== race.branchKeys.length) issues.push(`Раса «${race.key}»: гілка повторюється`);

    for (const key of race.branchKeys) {
      if (!source.branches.some((b) => b.key === key)) issues.push(`Раса «${race.key}»: невідома гілка «${key}»`);
    }
  }

  for (const skill of skills) {
    checkEntry("Скіл", skill);

    checkAbilities(`Скіл «${skill.key}»`, skill.abilities);

    for (const [field, ref] of [["newSpellKey", skill.newSpellKey], ["grantedSpellKey", skill.grantedSpellKey]] as const) {
      if (ref !== undefined && !spellByKey.has(ref)) issues.push(`Скіл «${skill.key}»: ${field} «${ref}» не знайдено`);
    }

    checkRefs(`Скіл «${skill.key}»`, skill.abilities);
  }

  const slotKeys: string[] = ARTIFACT_GRID_9.map((slot) => slot.key);

  for (const set of source.artifactSets) {
    checkEntry("Сет артефактів", set, artifactIcons);

    if (set.artifacts.length < 3) issues.push(`Сет «${set.key}»: менше 3 артефактів`);

    const slots = new Set<string>();

    for (const a of set.artifacts) {
      if (!slotKeys.includes(a.slot)) issues.push(`Сет «${set.key}»: невідомий слот «${a.slot}»`);
      else if (slots.has(a.slot)) issues.push(`Сет «${set.key}»: слот «${a.slot}» повторюється`);

      slots.add(a.slot);

      checkEntry("Артефакт", a, artifactIcons);
      checkAbilities(`Артефакт «${a.key}»`, a.abilities);
      checkRefs(`Артефакт «${a.key}»`, a.abilities);
    }

    checkAbilities(`Сет «${set.key}»`, set.abilities);
    checkRefs(`Сет «${set.key}»`, set.abilities);
  }

  const allArtifacts = source.artifactSets.flatMap((set) => set.artifacts);

  checkUnique("Заклинання", "key", source.spells);
  checkUnique("Заклинання", "name", source.spells);
  checkUnique("Гілки", "key", source.branches);
  checkUnique("Гілки", "name", source.branches);
  checkUnique("Раси", "key", source.races);
  checkUnique("Раси", "name", source.races);
  checkUnique("Скіли", "key", skills);
  checkUnique("Скіли", "name", skills);
  checkUnique("Артефакти", "key", allArtifacts);
  checkUnique("Артефакти", "name", allArtifacts);
  checkUnique("Сети артефактів", "key", source.artifactSets);
  checkUnique("Сети артефактів", "name", source.artifactSets);

  if (issues.length > 0) throw new Error(`Бібліотека невалідна:\n${issues.map((i) => `- ${i}`).join("\n")}`);

  return { ...source, schools, skills, spellByKey, raceByKey };
}
