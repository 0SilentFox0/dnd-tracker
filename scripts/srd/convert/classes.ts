import { coreAbility, noteAbility } from "../lib/abilities";
import { type Fixture, type O5Feature, type Open5eData, slugTail } from "../lib/open5e";
import { ABILITY_BY_SHORT, bySlug } from "../lib/text";
import type { ClassFeatureGroup, ClassRow } from "../lib/types";
import { CLASS_FEATURE_OVERRIDES, DROP_FEATURES, FEATURE_LEVELS, SAVING_THROW_FIXES, SPELLCASTING_ABILITY, TYPO_FIXES } from "../overrides/classes";

import { ABILITY_KEYS } from "@/lib/constants/abilities";
import type { ClassCaster } from "@/lib/constants/classes";
import { DND_SKILLS, type DndSkill } from "@/lib/constants/skills";
import type { Ability } from "@/lib/utils/abilities/schema";
import { groupBy } from "@/lib/utils/common/collections";

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

function featureAbility(f: Fixture<O5Feature>, level: number): Ability {
  const id = `${slugTail(f.pk)}-${level}`;

  const name = TYPO_FIXES[f.fields.name] ?? f.fields.name;

  const desc = f.fields.desc.trim();

  const core = CLASS_FEATURE_OVERRIDES[f.pk];

  return core ? coreAbility(id, name, desc, core) : noteAbility(id, name, desc);
}

function featureGroups(data: Open5eData, ownerPk: string, levelsOf: Map<string, number[]>): ClassFeatureGroup[] {
  const byLevel = new Map<number, Ability[]>();

  for (const f of data.features) {
    if (f.fields.parent !== ownerPk || DROP_TYPES.has(f.fields.feature_type ?? "") || DROP_FEATURES.has(f.pk) || SPELL_LIST.test(f.pk)) continue;

    let levels = levelsOf.get(f.pk) ?? (FEATURE_LEVELS[f.pk] !== undefined ? [FEATURE_LEVELS[f.pk]] : null);

    if (!levels) throw new Error(`Feature without level: ${f.pk}`);

    if (levels.length > COLUMN_LIKE_ROWS) levels = [levels[0]];

    for (const level of levels) byLevel.set(level, [...(byLevel.get(level) ?? []), featureAbility(f, level)]);
  }

  return [...byLevel].sort(([a], [b]) => a - b).map(([level, abilities]) => ({ level, abilities }));
}

export function convertClasses(data: Open5eData): ClassRow[] {
  const levelsOf = new Map([...groupBy(data.featureItems, (i) => i.fields.parent)].map(([pk, rows]) => [pk, [...new Set(rows.map((r) => r.fields.level))].sort((a, b) => a - b)]));

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
        ...parseCoreTraits(core.fields.desc),
        caster: CASTER[c.fields.caster_type] ?? "none",
        spellcastingAbility: SPELLCASTING_ABILITY[c.pk] ?? null,
        features: featureGroups(data, c.pk, levelsOf),
        subclassLevel: 3,
        subclasses: data.classes
          .filter((s) => s.fields.subclass_of === c.pk)
          .map((s) => ({ id: slugTail(s.pk), name: s.fields.name, features: featureGroups(data, s.pk, levelsOf) })),
      };
    })
    .sort(bySlug);
}
