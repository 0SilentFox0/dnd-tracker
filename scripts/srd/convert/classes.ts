import { coreAbility, noteAbility } from "../lib/abilities";
import { type Fixture, type O5Feature, type O5FeatureItem, type Open5eData, slugTail } from "../lib/open5e";
import { ABILITY_BY_SHORT, bySlug } from "../lib/text";
import type { ClassFeatureGroup, ClassRow } from "../lib/types";
import {
  CLASS_FEATURE_OVERRIDES,
  COLUMN_FEATURES,
  COLUMN_LABELS,
  DROP_COLUMNS,
  DROP_FEATURES,
  EXTRA_COLUMNS,
  FEATURE_LEVELS,
  type FeatureOption,
  KEEP_SPELL_LISTS,
  MULTICLASS_PROFICIENCIES,
  POOL_COLUMNS,
  SAVING_THROW_FIXES,
  SINGLE_LEVEL_FEATURES,
  SPELLCASTING_ABILITY,
  TYPO_FIXES,
} from "../overrides/classes";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import type { ClassCaster } from "@/lib/constants/classes";
import { MAX_CLASS_LEVEL } from "@/lib/constants/classes";
import { DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import type { Ability } from "@/lib/utils/abilities/schema";
import { groupBy } from "@/lib/utils/common/collections";
import type { ClassColumn } from "@/types/classes";

const DROP_TYPES = new Set(["PROFICIENCY_BONUS", "CLASS_TABLE_DATA", "SPELL_SLOTS", "CORE_TRAITS_TABLE"]);

const SPELL_LIST = /spell-list$/;

const COLUMN_LIKE_ROWS = 6;

const CASTER: Record<string, ClassCaster> = { NONE: "none", FULL: "full", HALF: "half", PACT: "pact" };

const PROF_MAX = 60;

function skillKey(name: string): DndSkill {
  const flat = name.replace(/\s+/g, "").toLowerCase();

  const key = DND_SKILLS.find((k) => k.toLowerCase() === flat);

  if (!key) throw new Error(`Unknown skill «${name}»`);

  return key;
}

function splitProficiency(text: string): string[] {
  if (!text || /^none$/i.test(text)) return [];

  if (text.length <= PROF_MAX) return [text];

  return text
    .split(/,\s*(?:and\s+)?|\s+and\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.slice(0, PROF_MAX));
}

export function parseCoreTraits(desc: string): Pick<ClassRow, "skillChoices" | "proficiencies"> {
  const cell = (label: string) => new RegExp(`\\|${label}\\|([^|]*)\\|`).exec(desc)?.[1]?.trim() ?? "";

  const skills = cell("Skill Proficiencies");

  const count = Number(/Choose (?:any )?(\d+)/i.exec(skills)?.[1] ?? 0);

  const list = skills.includes(":") ? skills.slice(skills.indexOf(":") + 1) : "";

  const from = list
    ? list
        .split(/,\s*(?:or\s+)?|\s+or\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(skillKey)
    : [...DND_SKILLS];

  return {
    skillChoices: { count, from },
    proficiencies: { armor: splitProficiency(cell("Armor Training")), weapons: splitProficiency(cell("Weapon Proficiencies")), tools: splitProficiency(cell("Tool Proficiencies")) },
  };
}

function withMulticlass(traits: ReturnType<typeof parseCoreTraits>, classSlug: string) {
  const entry = MULTICLASS_PROFICIENCIES[classSlug];

  if (!entry) return traits;

  const { skills, ...lists } = entry;

  const multiclass = skills ? { ...lists, skills: { count: skills.count, from: skills.from === "any" ? [...DND_SKILLS] : traits.skillChoices.from } } : lists;

  return { ...traits, proficiencies: { ...traits.proficiencies, multiclass } };
}

function featureAbilities(f: Fixture<O5Feature>, level: number): Ability[] {
  const tail = slugTail(f.pk);

  const name = TYPO_FIXES[f.fields.name] ?? f.fields.name;

  const desc = f.fields.desc.trim();

  const core = CLASS_FEATURE_OVERRIDES[f.pk];

  if (!core) return [noteAbility(`${tail}-${level}`, name, desc)];

  if (Array.isArray(core)) return core.map(({ name: optionName, slug, description, ...rest }: FeatureOption) => coreAbility(`${tail}-${slug}-${level}`, optionName, description ?? desc, rest));

  return [coreAbility(`${tail}-${level}`, name, desc, core)];
}

function featureGroups(data: Open5eData, ownerPk: string, levelsOf: Map<string, number[]>): ClassFeatureGroup[] {
  const byLevel = new Map<number, Ability[]>();

  for (const f of data.features) {
    if (f.fields.parent !== ownerPk || DROP_TYPES.has(f.fields.feature_type ?? "") || DROP_FEATURES.has(f.pk) || (SPELL_LIST.test(f.pk) && !KEEP_SPELL_LISTS.has(f.pk))) continue;

    let levels = levelsOf.get(f.pk) ?? (FEATURE_LEVELS[f.pk] !== undefined ? [FEATURE_LEVELS[f.pk]] : null);

    if (!levels) throw new Error(`Feature without level: ${f.pk}`);

    if (levels.length > COLUMN_LIKE_ROWS || SINGLE_LEVEL_FEATURES.has(f.pk)) levels = [levels[0]];

    for (const level of levels) byLevel.set(level, [...(byLevel.get(level) ?? []), ...featureAbilities(f, level)]);
  }

  return [...byLevel].sort(([a], [b]) => a - b).map(([level, abilities]) => ({ level, abilities }));
}

const COLUMN_SUFFIX = /-column-data$/;

export const columnKey = (featurePk: string, classPk: string) => featurePk.slice(classPk.length + 1).replace(COLUMN_SUFFIX, "");

function columnsOf(data: Open5eData, classPk: string, itemsOf: Map<string, Fixture<O5FeatureItem>[]>): ClassColumn[] {
  const fromTable = data.features
    .filter((f) => f.fields.parent === classPk && (f.fields.feature_type === "CLASS_TABLE_DATA" || COLUMN_FEATURES.has(f.pk)) && !DROP_COLUMNS.has(f.pk))
    .map((f): ClassColumn => {
      const rows = itemsOf.get(f.pk) ?? [];

      return {
        key: columnKey(f.pk, classPk),
        label: COLUMN_LABELS[f.pk] ?? TYPO_FIXES[f.fields.name] ?? f.fields.name,
        values: Array.from({ length: MAX_CLASS_LEVEL }, (_, i) => rows.filter((r) => r.fields.level === i + 1).map((r) => r.fields.column_value?.trim()).find(Boolean) ?? ""),
        ...(POOL_COLUMNS[f.pk] && { pool: POOL_COLUMNS[f.pk] }),
      };
    });

  return [...fromTable, ...(EXTRA_COLUMNS[classPk] ?? [])].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

export function convertClasses(data: Open5eData): ClassRow[] {
  const itemsOf = groupBy(data.featureItems, (i) => i.fields.parent);

  const levelsOf = new Map([...itemsOf].map(([pk, rows]) => [pk, [...new Set(rows.map((r) => r.fields.level))].sort((a, b) => a - b)]));

  return data.classes
    .filter((c) => !c.fields.subclass_of)
    .map((c) => {
      const core = data.features.find((f) => f.fields.parent === c.pk && f.fields.feature_type === "CORE_TRAITS_TABLE");

      if (!core) throw new Error(`No core traits: ${c.pk}`);

      const hitDie = Number(c.fields.hit_dice?.replace(/^D/i, ""));

      if (![6, 8, 10, 12].includes(hitDie)) throw new Error(`Bad hit die: ${c.pk}`);

      return {
        slug: c.pk,
        name: c.fields.name,
        hitDie: hitDie as ClassRow["hitDie"],
        savingThrows: SAVING_THROW_FIXES[c.pk] ?? ABILITY_KEYS.filter((k) => c.fields.saving_throws.some((s) => ABILITY_BY_SHORT[s] === k)),
        ...withMulticlass(parseCoreTraits(core.fields.desc), slugTail(c.pk)),
        caster: CASTER[c.fields.caster_type] ?? "none",
        spellcastingAbility: SPELLCASTING_ABILITY[c.pk] ?? null,
        features: featureGroups(data, c.pk, levelsOf),
        subclassLevel: 3,
        subclasses: data.classes
          .filter((s) => s.fields.subclass_of === c.pk)
          .map((s) => ({ id: slugTail(s.pk), name: s.fields.name, features: featureGroups(data, s.pk, levelsOf) })),
        columns: columnsOf(data, c.pk, itemsOf),
      };
    })
    .sort(bySlug);
}
