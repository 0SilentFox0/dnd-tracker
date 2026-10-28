import { nameField, recordLabels, textField } from "./common";

import { MAIN_SKILL_ROLE_LABELS, MAIN_SKILL_ROLES } from "@/lib/constants/main-skills";
import type { ImportSpec } from "@/types/content-import";

export const MAIN_SKILLS_IMPORT: ImportSpec = {
  kind: "main-skills",
  label: "Основні скіли",
  fields: [
    nameField(["Напад", "Магія Світла"]),
    { key: "color", label: "Колір", aliases: ["color"], type: "string", required: true, examples: ["#c0392b", "#f1c40f"] },
    textField("icon", "Іконка", ["icon"]),
    { key: "isEnableInSkillTree", label: "У дереві скілів", aliases: ["в дереві", "enabled"], type: "bool", examples: ["так", "так"] },
    { key: "spellGroupId", label: "Школа магії", aliases: ["школа", "spell group"], type: "ref", ref: "spell-groups", examples: ["", ""] },
    { key: "role", label: "Роль", aliases: ["role"], type: "enum", enumValues: MAIN_SKILL_ROLES, enumLabels: recordLabels(MAIN_SKILL_ROLE_LABELS), examples: ["Напад", "Магія"] },
  ],
};
