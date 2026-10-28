import type { GameClass } from "@prisma/client";

import { isAbilityKey } from "@/lib/constants/abilities";
import { CLASS_CASTERS, HIT_DICE } from "@/lib/constants/classes";
import { ClassColumnSchema } from "@/lib/schemas/classes";
import { classFeatureAbilities } from "@/lib/utils/abilities/read";
import { isRecord } from "@/lib/utils/common/is-record";
import type { ClassCaster, ClassColumn, GameClassData, HitDie, Subclass } from "@/types/classes";

const asObject = (v: unknown): Record<string, unknown> => (isRecord(v) ? v : {});

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

const abilityKey = (v: unknown) => (isAbilityKey(v) ? v : null);

function subclassesOf(v: unknown): Subclass[] {
  if (!Array.isArray(v)) return [];

  return v.flatMap((s) => {
    const o = asObject(s);

    return typeof o.id === "string" && typeof o.name === "string" ? [{ id: o.id, name: o.name, features: classFeatureAbilities(o.features) }] : [];
  });
}

function columnsOf(v: unknown): ClassColumn[] {
  if (!Array.isArray(v)) return [];

  return v.flatMap((c) => {
    const parsed = ClassColumnSchema.safeParse(c);

    return parsed.success ? [parsed.data] : [];
  });
}

function multiclassSkills(raw: unknown) {
  const skills = asObject(raw);

  return typeof skills.count === "number" && skills.count > 0 ? { skills: { count: skills.count, from: strings(skills.from) } } : {};
}

export function toGameClassData(row: GameClass): GameClassData {
  const proficiencies = asObject(row.proficiencies);

  const skillChoices = asObject(row.skillChoices);

  const multiclass = isRecord(proficiencies.multiclass) ? proficiencies.multiclass : null;

  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    hitDie: ((HIT_DICE as readonly number[]).includes(row.hitDie) ? row.hitDie : 8) as HitDie,
    savingThrows: strings(row.savingThrows).flatMap((k) => abilityKey(k) ?? []),
    proficiencies: { armor: strings(proficiencies.armor), weapons: strings(proficiencies.weapons), tools: strings(proficiencies.tools) },
    ...(multiclass && { multiclassProficiencies: { armor: strings(multiclass.armor), weapons: strings(multiclass.weapons), ...multiclassSkills(multiclass.skills) } }),
    skillChoices: { count: typeof skillChoices.count === "number" ? skillChoices.count : 0, from: strings(skillChoices.from) },
    caster: ((CLASS_CASTERS as readonly string[]).includes(row.caster) ? row.caster : "none") as ClassCaster,
    spellcastingAbility: abilityKey(row.spellcastingAbility),
    features: classFeatureAbilities(row.features),
    subclassLevel: row.subclassLevel,
    subclasses: subclassesOf(row.subclasses),
    columns: columnsOf(row.columns),
    ...(row.spellList && { spellList: row.spellList }),
  };
}
