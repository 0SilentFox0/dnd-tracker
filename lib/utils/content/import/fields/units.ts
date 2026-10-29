import { ABILITY_ENUM, defineSpec, type FieldDef, jsonField, nameField } from "./common";

import { getProficiencyBonus } from "@/lib/utils/common/calculations";

const int = (key: string): FieldDef => ({ key, type: "int" });

const fields: FieldDef[] = [
  nameField(),
  int("level"),
  { key: "raceId", type: "ref", ref: "races" },
  { key: "avatar", type: "string" },
  int("initiative"),
  int("armorClass"),
  int("maxHp"),
  int("speed"),
  int("strength"),
  int("dexterity"),
  int("constitution"),
  int("intelligence"),
  int("wisdom"),
  int("charisma"),
  { key: "attacks", type: "attacks" },
  { key: "abilities", type: "abilitiesText", nestedRef: { kind: "spells", key: "spellId" } },
  { key: "immunities", type: "list" },
  { key: "knownSpells", type: "refList", ref: "spells" },
  jsonField("statblock"),
  { ...jsonField("spellcasting"), nestedRef: { kind: "spells", key: "spellId" } },
  int("proficiencyBonus"),
  int("gridSize"),
  int("morale"),
  int("minTargets"),
  int("maxTargets"),
  { key: "cr", type: "cr" },
  int("xp"),
  int("multiattack"),
  int("legendaryActions"),
  int("legendaryResistances"),
  { key: "saveProficiencies", type: "list", ...ABILITY_ENUM },
];

export const UNITS_IMPORT = defineSpec({
  kind: "units",
  fields,
  // the old CSV import derived proficiency from the tier; files without the column keep that
  toBody: (record, op) =>
    op === "create" && record.proficiencyBonus === undefined && record.cr === undefined
      ? { ...record, proficiencyBonus: getProficiencyBonus(typeof record.level === "number" ? record.level : 1) }
      : record,
});
