import { defineSpec, type FieldDef, jsonField, nameField, textField } from "./common";

import { SPELL_COSTS } from "@/lib/utils/spells/model/schema";

const fields: FieldDef[] = [
  nameField(),
  { key: "level", type: "int" },
  { key: "groupId", type: "ref", ref: "spell-groups" },
  textField("description"),
  textField("appearanceDescription"),
  textField("icon"),
  { key: "cost", type: "enum", enumValues: SPELL_COSTS },
  jsonField("casting"),
  { key: "dice", type: "dice" },
  { key: "dieSides", type: "int" },
  { key: "concentration", type: "bool" },
  { key: "ritual", type: "bool" },
  { key: "stackable", type: "bool" },
  { key: "maxStacks", type: "int" },
  { key: "upcastDice", type: "int" },
  { key: "upcastTargets", type: "int" },
  { key: "addAbilityMod", type: "bool" },
  { key: "fixedDice", type: "bool" },
  { key: "damageBonus", type: "int" },
  jsonField("targeting"),
  jsonField("resolution"),
  jsonField("spellEffects"),
  jsonField("raceModifiers"),
  jsonField("fx"),
  { key: "lists", type: "list" },
];

const DICE = /^(\d*)d(\d+)/;

export const SPELLS_IMPORT = defineSpec({
  kind: "spells",
  fields,
  toBody: (record) => {
    const m = typeof record.dice === "string" ? DICE.exec(record.dice) : null;

    if (!m) return record;

    return { ...record, dice: Number(m[1] || 1), ...(record.dieSides === undefined && { dieSides: Number(m[2]) }) };
  },
});
