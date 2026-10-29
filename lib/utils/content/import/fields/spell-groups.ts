import { defineSpec, nameField, textField } from "./common";

import { SPELL_GROUP_ICON_KEYS } from "@/lib/constants/spell-groups";
export const SPELL_GROUPS_IMPORT = defineSpec({
  kind: "spell-groups",
  fields: [
    nameField(),
    textField("color"),
    { key: "icon", type: "enum", enumValues: SPELL_GROUP_ICON_KEYS },
  ],
});
