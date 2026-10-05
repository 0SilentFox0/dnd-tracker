import type { Unit } from "@/types/units";

export function buildUnitFormData(unit: Unit): Partial<Unit> {
  const raceValue =
    (unit.race && unit.race.trim()) ||
    (unit.unitGroup?.name as string | undefined) ||
    null;

  return {
    name: unit.name,
    race: raceValue,
    level: unit.level,
    strength: unit.strength,
    dexterity: unit.dexterity,
    constitution: unit.constitution,
    intelligence: unit.intelligence,
    wisdom: unit.wisdom,
    charisma: unit.charisma,
    armorClass: unit.armorClass,
    initiative: unit.initiative,
    speed: unit.speed,
    maxHp: unit.maxHp,
    proficiencyBonus: unit.proficiencyBonus,
    attacks: Array.isArray(unit.attacks) ? unit.attacks : [],
    abilities: unit.abilities ?? [],
    immunities: Array.isArray(unit.immunities) ? unit.immunities : [],
    knownSpells: Array.isArray(unit.knownSpells) ? unit.knownSpells : [],
    groupId: unit.groupId || null,
    avatar: unit.avatar || null,
    damageModifier: unit.damageModifier || null,
    minTargets: unit.minTargets,
    maxTargets: unit.maxTargets,
  };
}

export function emptyUnitFormDefaults(): Partial<Unit> {
  return {
    name: "",
    level: 1,
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    armorClass: 10,
    initiative: 0,
    speed: 30,
    maxHp: 10,
    proficiencyBonus: 2,
    attacks: [],
    abilities: [],
    immunities: [],
    knownSpells: [],
    avatar: null,
    damageModifier: null,
    race: null,
    minTargets: 1,
    maxTargets: 1,
  };
}

export function buildUnitUpdatePayload(form: Partial<Unit>, unit: Unit | undefined): Partial<Unit> {
  return {
    ...form,
    knownSpells: form.knownSpells !== undefined ? form.knownSpells : unit?.knownSpells ?? [],
    race:
      form.race !== undefined
        ? String(form.race ?? "").trim() || null
        : (unit?.race?.trim() ?? null),
    avatar: form.avatar === undefined ? undefined : form.avatar || null,
    damageModifier: form.damageModifier === undefined ? undefined : form.damageModifier,
  };
}
