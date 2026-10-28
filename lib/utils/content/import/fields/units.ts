import { ABILITY_ENUM, jsonField, nameField } from "./common";

import { getProficiencyBonus } from "@/lib/utils/common/calculations";
import type { ImportField, ImportSpec } from "@/types/content-import";

const int = (key: string, label: string, aliases: readonly string[], examples: readonly [string, string]): ImportField => ({ key, label, aliases, type: "int", examples });

const fields: ImportField[] = [
  nameField(["Гоблін-лучник", "Вовк"]),
  int("level", "Рівень", ["tier", "тір"], ["1", "2"]),
  { key: "raceId", label: "Раса", aliases: ["група", "group", "race"], type: "ref", ref: "races", examples: ["", ""] },
  { key: "avatar", label: "Аватар", aliases: ["image", "url", "зображення"], type: "string", examples: ["", ""] },
  int("initiative", "Ініціатива", ["init"], ["2", "3"]),
  int("armorClass", "КД", ["ac", "клас броні", "armor class"], ["13", "13"]),
  int("maxHp", "ХП", ["hp", "хіти", "hit points", "hp_avg"], ["7 (2к6)", "11 (2к8 + 2)"]),
  int("speed", "Швидкість", [], ["30", "40"]),
  int("strength", "СИЛ", ["str", "сила"], ["8 (-1)", "12"]),
  int("dexterity", "ЛОВ", ["спр", "dex", "спритність"], ["14", "15"]),
  int("constitution", "ТІЛ", ["con", "статура"], ["10", "12"]),
  int("intelligence", "ІНТ", ["int", "інтелект"], ["10", "3"]),
  int("wisdom", "МДР", ["муд", "wis", "мудрість"], ["8", "12"]),
  int("charisma", "ХАР", ["cha", "харизма"], ["8", "6"]),
  { key: "attacks", label: "Атаки", aliases: ["атака"], type: "attacks", examples: ["Короткий лук +4, 1к6+2 колючий", "Укус +4, 2к4+2 колючий"] },
  { key: "abilities", label: "Навички/Здібності", aliases: ["особливості", "features", "здібності", "traits"], type: "abilitiesText", nestedRef: { kind: "spells", key: "spellId" }, examples: ["Втеча: бонусною дією відходить або ховається", "Зграя: перевага на атаку, якщо поруч союзник"] },
  { key: "immunities", label: "Імунітети", aliases: ["імунітет"], type: "list", examples: ["", "poison"] },
  { key: "knownSpells", label: "Заклинання", aliases: ["spells", "known spells"], type: "refList", ref: "spells", examples: ["", ""] },
  jsonField("statblock", "Статблок (JSON)", ["statblock"]),
  { ...jsonField("spellcasting", "Заклинання монстра (JSON)", ["spellcasting"]), nestedRef: { kind: "spells", key: "spellId" } },
  int("proficiencyBonus", "Майстерність", ["proficiency", "бонус майстерності"], ["", ""]),
  int("gridSize", "Розмір на мапі", ["клітинок"], ["1", "1"]),
  int("morale", "Мораль", [], ["0", "1"]),
  int("minTargets", "Мін. цілей", [], ["1", "1"]),
  int("maxTargets", "Макс. цілей", [], ["1", "1"]),
  { key: "cr", label: "CR", aliases: ["небезпека", "рівень небезпеки", "challenge"], type: "cr", examples: ["1/4", "1/4"] },
  int("xp", "XP", ["досвід"], ["", ""]),
  int("multiattack", "Мультиатака", ["атак за дію"], ["1", "1"]),
  int("legendaryActions", "Легендарні дії", ["legendary actions"], ["0", "0"]),
  int("legendaryResistances", "Легендарний опір", ["legendary resistance", "legendary resistances"], ["0", "0"]),
  { key: "saveProficiencies", label: "Рятівні кидки", aliases: ["save proficiencies", "saving throw proficiencies"], type: "list", ...ABILITY_ENUM, examples: ["", "dexterity, wisdom"] },
];

export const UNITS_IMPORT: ImportSpec = {
  kind: "units",
  label: "Юніти",
  fields,
  // the old CSV import derived proficiency from the tier; files without the column keep that
  toBody: (record, op) =>
    op === "create" && record.proficiencyBonus === undefined && record.cr === undefined
      ? { ...record, proficiencyBonus: getProficiencyBonus(typeof record.level === "number" ? record.level : 1) }
      : record,
};
