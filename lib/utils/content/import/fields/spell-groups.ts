import { nameField, textField } from "./common";

import { SPELL_GROUP_ICON_KEYS } from "@/lib/constants/spell-groups";
import type { ImportSpec } from "@/types/content-import";

export const SPELL_GROUPS_IMPORT: ImportSpec = {
  kind: "spell-groups",
  label: "Школи магії",
  fields: [
    nameField(["Магія Хаосу", "Магія Світла"]),
    textField("color", "Колір", ["color"], ["#e25822", "#f5d76e"]),
    { key: "icon", label: "Іконка", aliases: ["icon"], type: "enum", enumValues: SPELL_GROUP_ICON_KEYS, examples: ["flame", "sun"] },
  ],
};
