import { abilitiesField, nameField, textField } from "./common";

import type { ImportField, ImportRecord, ImportSpec } from "@/types/content-import";

const fields: ImportField[] = [
  nameField(["Стійкість", "Майстер меча"]),
  textField("description", "Опис", ["description"], ["+1 до КД", "Додаткова атака мечем"]),
  textField("icon", "Іконка", ["icon"]),
  textField("image", "Зображення", ["image"]),
  { key: "mainSkillId", label: "Основний скіл", aliases: ["гілка", "main skill"], type: "ref", ref: "main-skills", examples: ["", ""] },
  { key: "spellId", label: "Заклинання", aliases: ["spell"], type: "ref", ref: "spells", examples: ["", ""] },
  { key: "spellGroupId", label: "Школа магії", aliases: ["школа", "spell group"], type: "ref", ref: "spell-groups", examples: ["", ""] },
  { key: "grantedSpellId", label: "Дає заклинання", aliases: ["granted spell"], type: "ref", ref: "spells", examples: ["", ""] },
  abilitiesField(["Стійкість: +1 до КД", ""]),
];

const pick = (record: ImportRecord, keys: readonly string[]): ImportRecord => Object.fromEntries(keys.filter((k) => record[k] !== undefined).map((k) => [k, record[k]]));

export const SKILLS_IMPORT: ImportSpec = {
  kind: "skills",
  label: "Скіли",
  fields,
  toBody: (record, op) => {
    const groups = {
      basicInfo: pick(record, ["name", "description", "icon"]),
      spellData: pick(record, ["spellId", "spellGroupId", "grantedSpellId"]),
      mainSkillData: pick(record, ["mainSkillId"]),
    };

    const body = pick(record, ["abilities", "image"]);

    for (const [key, group] of Object.entries(groups)) if (op === "create" || Object.keys(group).length > 0) body[key] = group;

    return body;
  },
};
