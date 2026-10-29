import { abilitiesField, defineSpec, type FieldDef, nameField, textField } from "./common";

import type { ImportRecord } from "@/types/content-import";

const fields: FieldDef[] = [
  nameField(),
  textField("description"),
  textField("icon"),
  textField("image"),
  { key: "mainSkillId", type: "ref", ref: "main-skills" },
  { key: "spellId", type: "ref", ref: "spells" },
  { key: "spellGroupId", type: "ref", ref: "spell-groups" },
  { key: "grantedSpellId", type: "ref", ref: "spells" },
  abilitiesField(),
];

const pick = (record: ImportRecord, keys: readonly string[]): ImportRecord => Object.fromEntries(keys.filter((k) => record[k] !== undefined).map((k) => [k, record[k]]));

export const SKILLS_IMPORT = defineSpec({
  kind: "skills",
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
});
