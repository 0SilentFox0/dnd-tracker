import { proficiencyForChallenge } from "@/lib/constants/challenge";
import type { Unit } from "@/types/units";

export function buildUnitFormData(unit: Unit): Partial<Unit> {
  return {
    name: unit.name,
    raceId: unit.raceId ?? null,
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
    avatar: unit.avatar || null,
    minTargets: unit.minTargets,
    maxTargets: unit.maxTargets,
    gridSize: unit.gridSize ?? 1,
    cr: unit.cr ?? null,
    xp: unit.xp ?? null,
    multiattack: unit.multiattack ?? 1,
    legendaryActions: unit.legendaryActions ?? 0,
    legendaryResistances: unit.legendaryResistances ?? 0,
    saveProficiencies: unit.saveProficiencies ?? [],
    statblock: unit.statblock ?? {},
    spellcasting: { ...unit.spellcasting, spells: unit.spellcasting?.spells ?? [] },
  };
}

export function emptyUnitFormDefaults(): Partial<Unit> {
  return {
    name: "",
    raceId: null,
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
    minTargets: 1,
    maxTargets: 1,
    gridSize: 1,
    cr: null,
    xp: null,
    multiattack: 1,
    legendaryActions: 0,
    legendaryResistances: 0,
    saveProficiencies: [],
    statblock: {},
    spellcasting: { spells: [] },
  };
}

export function applyChallenge(cr: number | null): Partial<Unit> {
  return cr === null ? { cr: null } : { cr, proficiencyBonus: proficiencyForChallenge(cr) };
}

const cleanAvatar = (avatar: string | null | undefined) => avatar?.trim() || null;

// Stored avatars may predate the avatar schema; resending them unchanged would fail the whole PATCH
export function buildUnitUpdatePayload(form: Partial<Unit>, unit: Unit | undefined): Partial<Unit> {
  const { avatar, ...rest } = form;

  const payload: Partial<Unit> = { ...rest, knownSpells: form.knownSpells ?? unit?.knownSpells ?? [] };

  if (avatar === undefined || cleanAvatar(avatar) === (unit?.avatar ?? null)) return payload;

  return { ...payload, avatar: cleanAvatar(avatar) };
}

export function buildUnitCreatePayload(form: Partial<Unit>): Partial<Unit> {
  return { ...form, avatar: cleanAvatar(form.avatar) };
}
