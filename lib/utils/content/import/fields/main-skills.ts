import { defineSpec, nameField, recordLabels, textField } from "./common";

import { MAIN_SKILL_ROLE_LABELS, MAIN_SKILL_ROLES } from "@/lib/constants/main-skills";
export const MAIN_SKILLS_IMPORT = defineSpec({
  kind: "main-skills",
  fields: [
    nameField(),
    { key: "color", type: "string", required: true },
    textField("icon"),
    { key: "isEnableInSkillTree", type: "bool" },
    { key: "spellGroupId", type: "ref", ref: "spell-groups" },
    { key: "role", type: "enum", enumValues: MAIN_SKILL_ROLES, enumLabels: recordLabels(MAIN_SKILL_ROLE_LABELS) },
  ],
});
